<?php

namespace App\Http\Controllers\Api\V1;

use App\Domains\Catalog\Models\Product;
use App\Domains\Governance\Services\AuditLogger;
use App\Domains\Identity\Models\Branch;
use App\Domains\Inventory\Models\InventoryBalance;
use App\Domains\Inventory\Models\InventoryMovement;
use App\Http\Controllers\Controller;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class InventoryTransferController extends Controller
{
    public function __construct(private readonly AuditLogger $auditLogger)
    {
    }

    public function store(Request $request): JsonResponse
    {
        if (! $request->user()->hasPermission('inventory.read')) {
            throw new AuthorizationException;
        }

        $validated = $request->validate([
            'fromBranchId' => ['required', 'integer', 'exists:branches,id'],
            'toBranchId' => ['required', 'integer', 'exists:branches,id', 'different:fromBranchId'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.productId' => ['required', 'integer', 'exists:products,id'],
            'lines.*.quantity' => ['required', 'numeric', 'gt:0'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $fromBranch = Branch::query()->findOrFail($validated['fromBranchId']);
        $toBranch = Branch::query()->findOrFail($validated['toBranchId']);
        $actor = $request->user();
        $correlationId = (string) Str::uuid();

        return DB::transaction(function () use ($fromBranch, $toBranch, $validated, $actor, $correlationId) {
            $transferReference = 'TRF-'.strtoupper(Str::random(10));
            $transferredItems = [];

            foreach ($validated['lines'] as $line) {
                $productId = (int) $line['productId'];
                $qtyToTransfer = (string) $line['quantity'];
                $product = Product::query()->findOrFail($productId);

                // Lock source branch balance
                $sourceBalance = InventoryBalance::query()
                    ->where('branch_id', $fromBranch->id)
                    ->where('product_id', $productId)
                    ->lockForUpdate()
                    ->first();

                $sourceAvailable = $sourceBalance ? (string) $sourceBalance->available_quantity : '0.0000';

                if (bccomp($sourceAvailable, $qtyToTransfer, 4) === -1) {
                    throw ValidationException::withMessages([
                        'lines' => ["Not enough available stock for {$product->name} at {$fromBranch->name}. Available: {$sourceAvailable}, Requested: {$qtyToTransfer}."],
                    ]);
                }

                // Deduct from Source Branch
                $sourceOnHandBefore = $sourceBalance->on_hand_quantity;
                $sourceOnHandAfter = bcsub($sourceOnHandBefore, $qtyToTransfer, 4);
                $sourceBalance->on_hand_quantity = $sourceOnHandAfter;
                $sourceBalance->available_quantity = bcsub($sourceBalance->available_quantity, $qtyToTransfer, 4);
                $sourceBalance->last_movement_at = now();
                $sourceBalance->row_version = $sourceBalance->row_version + 1;
                $sourceBalance->save();

                // Record Source Movement
                InventoryMovement::query()->create([
                    'branch_id' => $fromBranch->id,
                    'product_id' => $productId,
                    'movement_type' => 'adjustment',
                    'quantity_delta' => '-'.$qtyToTransfer,
                    'on_hand_after_quantity' => $sourceOnHandAfter,
                    'reference_type' => 'stock_transfer_out',
                    'reference_id' => $transferReference,
                    'effective_at' => now(),
                    'posted_at' => now(),
                    'actor_user_id' => $actor->id,
                    'correlation_id' => $correlationId,
                ]);

                // Lock or Create Target Branch Balance
                $targetBalance = InventoryBalance::query()
                    ->where('branch_id', $toBranch->id)
                    ->where('product_id', $productId)
                    ->lockForUpdate()
                    ->first();

                if (! $targetBalance) {
                    $targetBalance = InventoryBalance::query()->create([
                        'branch_id' => $toBranch->id,
                        'product_id' => $productId,
                        'on_hand_quantity' => '0.0000',
                        'reserved_quantity' => '0.0000',
                        'available_quantity' => '0.0000',
                        'incoming_quantity' => '0.0000',
                        'row_version' => 1,
                    ]);
                }

                $targetOnHandBefore = $targetBalance->on_hand_quantity;
                $targetOnHandAfter = bcadd($targetOnHandBefore, $qtyToTransfer, 4);
                $targetBalance->on_hand_quantity = $targetOnHandAfter;
                $targetBalance->available_quantity = bcadd($targetBalance->available_quantity, $qtyToTransfer, 4);
                $targetBalance->last_movement_at = now();
                $targetBalance->row_version = $targetBalance->row_version + 1;
                $targetBalance->save();

                // Record Target Movement
                InventoryMovement::query()->create([
                    'branch_id' => $toBranch->id,
                    'product_id' => $productId,
                    'movement_type' => 'adjustment',
                    'quantity_delta' => $qtyToTransfer,
                    'on_hand_after_quantity' => $targetOnHandAfter,
                    'reference_type' => 'stock_transfer_in',
                    'reference_id' => $transferReference,
                    'effective_at' => now(),
                    'posted_at' => now(),
                    'actor_user_id' => $actor->id,
                    'correlation_id' => $correlationId,
                ]);

                $transferredItems[] = [
                    'productId' => (string) $product->id,
                    'sku' => $product->sku,
                    'name' => $product->name,
                    'quantity' => $qtyToTransfer,
                ];
            }

            $this->auditLogger->record(
                $actor,
                'inventory_transfer.completed',
                'stock_transfer',
                $fromBranch->id,
                $fromBranch->id,
                $correlationId,
                null,
                [
                    'transferReference' => $transferReference,
                    'fromBranch' => $fromBranch->name,
                    'toBranch' => $toBranch->name,
                    'itemCount' => count($transferredItems),
                    'notes' => $validated['notes'] ?? null,
                ]
            );

            return response()->json([
                'data' => [
                    'transferReference' => $transferReference,
                    'fromBranch' => ['id' => (string) $fromBranch->id, 'name' => $fromBranch->name],
                    'toBranch' => ['id' => (string) $toBranch->id, 'name' => $toBranch->name],
                    'transferredAt' => now()->toIso8601String(),
                    'notes' => $validated['notes'] ?? null,
                    'items' => $transferredItems,
                ],
                'meta' => [
                    'requestId' => $correlationId,
                ],
            ]);
        });
    }
}
