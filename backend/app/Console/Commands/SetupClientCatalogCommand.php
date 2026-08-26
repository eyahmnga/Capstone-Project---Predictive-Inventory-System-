<?php

namespace App\Console\Commands;

use App\Domains\Catalog\Models\Category;
use App\Domains\Catalog\Models\Product;
use App\Domains\Catalog\Models\UnitOfMeasure;
use App\Domains\Identity\Models\Branch;
use App\Domains\Identity\Models\User;
use App\Domains\Inventory\Models\InventoryBalance;
use App\Domains\Inventory\Models\InventoryMovement;
use App\Domains\Planning\Models\ReorderPolicy;
use App\Domains\Planning\Services\EoqService;
use App\Domains\Planning\Services\RestockingAlertService;
use App\Domains\Planning\Services\SmaForecastService;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SetupClientCatalogCommand extends Command
{
    protected $signature = 'catalog:setup-client';

    protected $description = 'Purge old catalog, synchronize official 8 categories, 32 products, generate sales history, calculate EOQ, and run SMA demand forecasting.';

    public function handle(
        RestockingAlertService $alertService,
        EoqService $eoqService,
        SmaForecastService $forecastService
    ): int {
        $this->info('Starting Client Catalog, SMA, EOQ & Inventory Setup...');

        $branch = Branch::query()->where('code', 'MAIN')->first() ?? Branch::query()->first();
        if (! $branch) {
            $this->error('No branch found! Please run branch seeders first.');
            return self::FAILURE;
        }

        $owner = User::query()->where('email', env('OWNER_SEED_EMAIL', 'owner@stevenhydrotech.example'))->first()
            ?? User::query()->first();
        $manager = User::query()->whereHas('roles', fn ($q) => $q->where('code', 'manager'))->first() ?? $owner;
        $staff = User::query()->whereHas('roles', fn ($q) => $q->where('code', 'staff'))->first() ?? $owner;

        $units = UnitOfMeasure::query()->get()->keyBy('code');
        $eachUnit = $units->get('EA') ?? UnitOfMeasure::query()->first();
        $bagUnit = $units->get('BAG') ?? $eachUnit;

        // 1. Client Categories
        $categoriesDef = [
            'FILT' => ['name' => 'FILTERS', 'description' => 'Water filtration cartridges, carbon blocks, and slim filter vessels.'],
            'TANK' => ['name' => 'TANK', 'description' => 'FRP pressure vessels, multiport manual heads, and tank accessories.'],
            'WRS'  => ['name' => 'WATER REFILLING SUPPLIES', 'description' => 'Filter media: Manganese, Anthracite, Activated Carbon, Resin, Silica, and Pebbles.'],
            'PPR'  => ['name' => 'PPR FITTINGS', 'description' => 'PPR male adaptors, ball valves, union patente, elbows, and teflon tape.'],
            'PVC'  => ['name' => 'PVC FITTINGS', 'description' => 'PVC ball valves and standard plumbing fittings.'],
            'GAL'  => ['name' => 'GALLONS', 'description' => 'Slim gallon water containers and round caps.'],
            'SEAL' => ['name' => 'PLASTIC SEALER', 'description' => 'Faucet seals, umbrella seals, big cap seals, and small cap seals.'],
            'WIRE' => ['name' => 'WIRE', 'description' => 'Electrical liquid level switches, selector switches, and pressure gauges.'],
        ];

        // 2. Client 32 Products with planning profiles
        $productsDef = [
            // FILTERS (FILT)
            'SHX-FLT-001' => ['category' => 'FILT', 'unit' => 'EA', 'name' => '20-inch Slim Filter Vessel', 'price' => '600.0000', 'lead' => '5.00', 'safety' => '5.0000', 'rop' => '12.0000', 'stock' => '20.0000', 'annualD' => '350', 'orderCost' => '400', 'holdCost' => '30', 'dailySales' => [1, 2]],
            'SHX-FLT-002' => ['category' => 'FILT', 'unit' => 'EA', 'name' => 'Carbon Block Filter', 'price' => '500.0000', 'lead' => '5.00', 'safety' => '8.0000', 'rop' => '18.0000', 'stock' => '20.0000', 'annualD' => '600', 'orderCost' => '450', 'holdCost' => '25', 'dailySales' => [2, 4]],
            'SHX-FLT-003' => ['category' => 'FILT', 'unit' => 'EA', 'name' => 'Sediment Filter (5um & 1um)', 'price' => '100.0000', 'lead' => '5.00', 'safety' => '10.0000', 'rop' => '25.0000', 'stock' => '4.0000', 'annualD' => '1200', 'orderCost' => '350', 'holdCost' => '10', 'dailySales' => [3, 7]], // LOW STOCK DEMO

            // TANK (TANK)
            'SHX-TNK-001' => ['category' => 'TANK', 'unit' => 'EA', 'name' => '10x54 FRP Vessel (w/ tube & strainer)', 'price' => '2400.0000', 'lead' => '7.00', 'safety' => '3.0000', 'rop' => '8.0000', 'stock' => '15.0000', 'annualD' => '120', 'orderCost' => '600', 'holdCost' => '120', 'dailySales' => [0, 1]],
            'SHX-TNK-002' => ['category' => 'TANK', 'unit' => 'EA', 'name' => 'Manual Head (Softener)', 'price' => '1800.0000', 'lead' => '7.00', 'safety' => '3.0000', 'rop' => '7.0000', 'stock' => '12.0000', 'annualD' => '100', 'orderCost' => '500', 'holdCost' => '90', 'dailySales' => [0, 1]],
            'SHX-TNK-003' => ['category' => 'TANK', 'unit' => 'EA', 'name' => 'Manual Head (MMF/Standard)', 'price' => '1500.0000', 'lead' => '7.00', 'safety' => '3.0000', 'rop' => '7.0000', 'stock' => '10.0000', 'annualD' => '110', 'orderCost' => '500', 'holdCost' => '80', 'dailySales' => [0, 1]],
            'SHX-TNK-004' => ['category' => 'TANK', 'unit' => 'EA', 'name' => 'Used Manual Head', 'price' => '1000.0000', 'lead' => '7.00', 'safety' => '2.0000', 'rop' => '5.0000', 'stock' => '0.0000', 'annualD' => '60', 'orderCost' => '350', 'holdCost' => '50', 'dailySales' => [0, 1]], // OUT OF STOCK DEMO

            // WATER REFILLING SUPPLIES (WRS)
            'SHX-WRS-001' => ['category' => 'WRS', 'unit' => 'BAG', 'name' => 'Manganese (MnO2)', 'price' => '3500.0000', 'lead' => '5.00', 'safety' => '3.0000', 'rop' => '6.0000', 'stock' => '10.0000', 'annualD' => '80', 'orderCost' => '600', 'holdCost' => '150', 'dailySales' => [0, 1]],
            'SHX-WRS-002' => ['category' => 'WRS', 'unit' => 'BAG', 'name' => 'Anthracite', 'price' => '1700.0000', 'lead' => '5.00', 'safety' => '4.0000', 'rop' => '8.0000', 'stock' => '14.0000', 'annualD' => '150', 'orderCost' => '500', 'holdCost' => '80', 'dailySales' => [0, 1]],
            'SHX-WRS-003' => ['category' => 'WRS', 'unit' => 'BAG', 'name' => 'Granular Activated Carbon (GAC)', 'price' => '1700.0000', 'lead' => '5.00', 'safety' => '5.0000', 'rop' => '12.0000', 'stock' => '18.0000', 'annualD' => '250', 'orderCost' => '500', 'holdCost' => '80', 'dailySales' => [1, 2]],
            'SHX-WRS-004' => ['category' => 'WRS', 'unit' => 'BAG', 'name' => 'Resin (Softener)', 'price' => '1600.0000', 'lead' => '5.00', 'safety' => '5.0000', 'rop' => '10.0000', 'stock' => '16.0000', 'annualD' => '200', 'orderCost' => '500', 'holdCost' => '75', 'dailySales' => [1, 2]],
            'SHX-WRS-005' => ['category' => 'WRS', 'unit' => 'BAG', 'name' => 'Silica Sand', 'price' => '600.0000', 'lead' => '3.00', 'safety' => '10.0000', 'rop' => '20.0000', 'stock' => '25.0000', 'annualD' => '500', 'orderCost' => '400', 'holdCost' => '25', 'dailySales' => [1, 3]],
            'SHX-WRS-006' => ['category' => 'WRS', 'unit' => 'BAG', 'name' => 'Pebbles', 'price' => '500.0000', 'lead' => '3.00', 'safety' => '10.0000', 'rop' => '18.0000', 'stock' => '22.0000', 'annualD' => '450', 'orderCost' => '400', 'holdCost' => '20', 'dailySales' => [1, 3]],

            // PPR FITTINGS (PPR)
            'SHX-PPR-001' => ['category' => 'PPR', 'unit' => 'EA', 'name' => 'PPR Male Adaptor 1"', 'price' => '385.0000', 'lead' => '3.00', 'safety' => '8.0000', 'rop' => '15.0000', 'stock' => '20.0000', 'annualD' => '300', 'orderCost' => '350', 'holdCost' => '15', 'dailySales' => [1, 2]],
            'SHX-PPR-002' => ['category' => 'PPR', 'unit' => 'EA', 'name' => 'PPR Ball Valve 3/4', 'price' => '350.0000', 'lead' => '3.00', 'safety' => '8.0000', 'rop' => '16.0000', 'stock' => '20.0000', 'annualD' => '320', 'orderCost' => '350', 'holdCost' => '15', 'dailySales' => [1, 2]],
            'SHX-PPR-003' => ['category' => 'PPR', 'unit' => 'EA', 'name' => 'PPR Union Patente 3/4', 'price' => '85.0000', 'lead' => '3.00', 'safety' => '10.0000', 'rop' => '20.0000', 'stock' => '25.0000', 'annualD' => '450', 'orderCost' => '300', 'holdCost' => '5', 'dailySales' => [1, 3]],
            'SHX-PPR-004' => ['category' => 'PPR', 'unit' => 'EA', 'name' => 'PPR Union Patente 1/2', 'price' => '60.0000', 'lead' => '3.00', 'safety' => '10.0000', 'rop' => '20.0000', 'stock' => '25.0000', 'annualD' => '450', 'orderCost' => '300', 'holdCost' => '5', 'dailySales' => [1, 3]],
            'SHX-PPR-005' => ['category' => 'PPR', 'unit' => 'EA', 'name' => 'Male Adaptor 3/4', 'price' => '30.0000', 'lead' => '3.00', 'safety' => '15.0000', 'rop' => '30.0000', 'stock' => '35.0000', 'annualD' => '800', 'orderCost' => '300', 'holdCost' => '3', 'dailySales' => [2, 5]],
            'SHX-PPR-006' => ['category' => 'PPR', 'unit' => 'EA', 'name' => 'Elbow 3/4', 'price' => '25.0000', 'lead' => '3.00', 'safety' => '15.0000', 'rop' => '30.0000', 'stock' => '40.0000', 'annualD' => '900', 'orderCost' => '300', 'holdCost' => '2', 'dailySales' => [2, 6]],
            'SHX-PPR-007' => ['category' => 'PPR', 'unit' => 'EA', 'name' => 'PPR Elbow 1/2', 'price' => '15.0000', 'lead' => '3.00', 'safety' => '20.0000', 'rop' => '40.0000', 'stock' => '50.0000', 'annualD' => '1200', 'orderCost' => '300', 'holdCost' => '2', 'dailySales' => [3, 8]],
            'SHX-PPR-008' => ['category' => 'PPR', 'unit' => 'EA', 'name' => 'Teflon Tape 3/4', 'price' => '15.0000', 'lead' => '2.00', 'safety' => '20.0000', 'rop' => '35.0000', 'stock' => '120.0000', 'annualD' => '1500', 'orderCost' => '300', 'holdCost' => '2', 'dailySales' => [4, 10]], // OVERSTOCK DEMO

            // PVC FITTINGS (PVC)
            'SHX-PVC-001' => ['category' => 'PVC', 'unit' => 'EA', 'name' => 'PVC Ball Valve', 'price' => '300.0000', 'lead' => '3.00', 'safety' => '6.0000', 'rop' => '12.0000', 'stock' => '20.0000', 'annualD' => '240', 'orderCost' => '350', 'holdCost' => '15', 'dailySales' => [1, 2]],

            // GALLONS (GAL)
            'SHX-GAL-001' => ['category' => 'GAL', 'unit' => 'EA', 'name' => 'Slim Gallon (5 Gallons)', 'price' => '130.0000', 'lead' => '3.00', 'safety' => '15.0000', 'rop' => '45.0000', 'stock' => '8.0000', 'annualD' => '2500', 'orderCost' => '400', 'holdCost' => '10', 'dailySales' => [6, 15]], // LOW STOCK DEMO
            'SHX-GAL-002' => ['category' => 'GAL', 'unit' => 'EA', 'name' => 'Round Cap', 'price' => '10.0000', 'lead' => '2.00', 'safety' => '30.0000', 'rop' => '60.0000', 'stock' => '80.0000', 'annualD' => '4000', 'orderCost' => '300', 'holdCost' => '1', 'dailySales' => [10, 25]],

            // PLASTIC SEALER (SEAL)
            'SHX-SEL-001' => ['category' => 'SEAL', 'unit' => 'EA', 'name' => 'Faucet Seal (x1000)', 'price' => '125.0000', 'lead' => '3.00', 'safety' => '10.0000', 'rop' => '22.0000', 'stock' => '30.0000', 'annualD' => '600', 'orderCost' => '350', 'holdCost' => '10', 'dailySales' => [1, 4]],
            'SHX-SEL-002' => ['category' => 'SEAL', 'unit' => 'EA', 'name' => 'Big Cap Seal (x500)', 'price' => '120.0000', 'lead' => '3.00', 'safety' => '10.0000', 'rop' => '20.0000', 'stock' => '25.0000', 'annualD' => '500', 'orderCost' => '350', 'holdCost' => '10', 'dailySales' => [1, 3]],
            'SHX-SEL-003' => ['category' => 'SEAL', 'unit' => 'EA', 'name' => 'Umbrella Seal (x500)', 'price' => '120.0000', 'lead' => '3.00', 'safety' => '8.0000', 'rop' => '16.0000', 'stock' => '20.0000', 'annualD' => '400', 'orderCost' => '350', 'holdCost' => '10', 'dailySales' => [1, 3]],
            'SHX-SEL-004' => ['category' => 'SEAL', 'unit' => 'EA', 'name' => 'Small Cap Seal (x1000)', 'price' => '105.0000', 'lead' => '3.00', 'safety' => '8.0000', 'rop' => '16.0000', 'stock' => '20.0000', 'annualD' => '400', 'orderCost' => '350', 'holdCost' => '10', 'dailySales' => [1, 3]],
            'SHX-SEL-005' => ['category' => 'SEAL', 'unit' => 'EA', 'name' => 'Faucet Seal (x500)', 'price' => '60.0000', 'lead' => '3.00', 'safety' => '10.0000', 'rop' => '20.0000', 'stock' => '85.0000', 'annualD' => '600', 'orderCost' => '300', 'holdCost' => '5', 'dailySales' => [2, 5]], // OVERSTOCK DEMO

            // WIRE (WIRE)
            'SHX-WIR-001' => ['category' => 'WIRE', 'unit' => 'EA', 'name' => 'Liquid Level Switch', 'price' => '500.0000', 'lead' => '5.00', 'safety' => '4.0000', 'rop' => '8.0000', 'stock' => '0.0000', 'annualD' => '150', 'orderCost' => '400', 'holdCost' => '35', 'dailySales' => [0, 1]], // OUT OF STOCK DEMO
            'SHX-WIR-002' => ['category' => 'WIRE', 'unit' => 'EA', 'name' => 'Pressure Gauge (0–100 psi)', 'price' => '300.0000', 'lead' => '5.00', 'safety' => '4.0000', 'rop' => '8.0000', 'stock' => '15.0000', 'annualD' => '180', 'orderCost' => '350', 'holdCost' => '20', 'dailySales' => [0, 1]],
            'SHX-WIR-003' => ['category' => 'WIRE', 'unit' => 'EA', 'name' => 'Selector Switch', 'price' => '200.0000', 'lead' => '5.00', 'safety' => '4.0000', 'rop' => '8.0000', 'stock' => '12.0000', 'annualD' => '150', 'orderCost' => '350', 'holdCost' => '15', 'dailySales' => [0, 1]],
        ];

        $validSkus = array_keys($productsDef);
        $validCategoryCodes = array_keys($categoriesDef);

        $this->info('1. Purging legacy demo data and old forecast/EOQ records...');
        DB::transaction(function () use ($validSkus, $validCategoryCodes) {
            // Delete all old forecast runs, restocking alerts, and EOQ calculations
            DB::table('forecast_run_items')->delete();
            DB::table('forecast_runs')->delete();
            DB::table('restocking_alert_events')->delete();
            DB::table('restocking_alerts')->delete();
            DB::table('eoq_calculations')->delete();

            // Clear previous seeded sales and payments
            DB::table('sale_payments')->delete();
            DB::table('sale_lines')->delete();
            DB::table('sales')->delete();

            // Purge obsolete products
            $oldProducts = Product::withTrashed()->whereNotIn('sku', $validSkus)->get();
            foreach ($oldProducts as $oldProduct) {
                DB::table('reorder_policies')->where('product_id', $oldProduct->id)->delete();
                DB::table('inventory_adjustment_lines')->where('product_id', $oldProduct->id)->delete();
                $poLineIds = DB::table('purchase_order_lines')->where('product_id', $oldProduct->id)->pluck('id')->all();
                if (! empty($poLineIds)) {
                    DB::table('goods_receipt_lines')->whereIn('purchase_order_line_id', $poLineIds)->delete();
                    DB::table('purchase_order_lines')->whereIn('id', $poLineIds)->delete();
                }
                DB::table('inventory_movements')->where('product_id', $oldProduct->id)->delete();
                DB::table('inventory_balances')->where('product_id', $oldProduct->id)->delete();
                $oldProduct->forceDelete();
            }

            // Purge obsolete categories
            Category::withTrashed()->whereNotIn('code', $validCategoryCodes)->forceDelete();
        });

        $this->info('2. Synchronizing 8 categories and 32 client products...');
        $categories = [];
        foreach ($categoriesDef as $code => $def) {
            $categories[$code] = Category::withTrashed()->updateOrCreate(
                ['code' => $code],
                [
                    'name' => $def['name'],
                    'description' => $def['description'],
                    'is_active' => true,
                    'deleted_at' => null,
                    'row_version' => 1,
                ],
            );
        }

        $products = [];
        foreach ($productsDef as $sku => $def) {
            $unitModel = $def['unit'] === 'BAG' ? $bagUnit : $eachUnit;

            $products[$sku] = Product::withTrashed()->updateOrCreate(
                ['sku' => $sku],
                [
                    'category_id' => $categories[$def['category']]->id,
                    'stock_unit_id' => $unitModel->id,
                    'name' => $def['name'],
                    'description' => "Official client catalog item: {$def['name']}.",
                    'image_url' => null,
                    'product_type' => 'stock',
                    'default_tax_rate' => '12.0000',
                    'selling_price' => $def['price'],
                    'default_lead_time_days' => $def['lead'],
                    'is_active' => true,
                    'deleted_at' => null,
                    'is_lot_tracked' => false,
                    'is_serial_tracked' => false,
                    'is_expiry_tracked' => false,
                    'row_version' => 1,
                ],
            );

            // Update Stock Balances
            InventoryBalance::query()->updateOrCreate(
                ['branch_id' => $branch->id, 'product_id' => $products[$sku]->id],
                [
                    'on_hand_quantity' => $def['stock'],
                    'available_quantity' => $def['stock'],
                    'reserved_quantity' => '0.0000',
                    'incoming_quantity' => '0.0000',
                    'last_movement_at' => now(),
                    'row_version' => 1,
                ],
            );

            InventoryMovement::query()->firstOrCreate(
                [
                    'branch_id' => $branch->id,
                    'product_id' => $products[$sku]->id,
                    'reference_type' => 'initial_setup',
                    'reference_id' => (string) $products[$sku]->id,
                ],
                [
                    'movement_type' => 'receipt',
                    'quantity_delta' => $def['stock'],
                    'on_hand_after_quantity' => $def['stock'],
                    'effective_at' => now(),
                    'posted_at' => now(),
                    'actor_user_id' => $manager->id,
                    'correlation_id' => (string) Str::uuid(),
                ],
            );

            // Create / update Reorder Policy
            $policy = ReorderPolicy::query()->updateOrCreate(
                ['branch_id' => $branch->id, 'product_id' => $products[$sku]->id],
                [
                    'safety_stock_quantity' => $def['safety'],
                    'safety_stock_basis' => 'policy_minimum',
                    'reorder_point_quantity' => $def['rop'],
                    'min_order_quantity' => $def['safety'],
                    'max_order_quantity' => '100.0000',
                    'rop_calculated_at' => now(),
                    'is_active' => true,
                    'row_version' => 1,
                    'created_by_user_id' => $manager->id,
                    'updated_by_user_id' => $manager->id,
                ],
            );

            // Calculate EOQ recommendation
            $eoqService->calculate($policy, [
                'annual_demand_quantity' => $def['annualD'],
                'ordering_cost' => $def['orderCost'],
                'annual_holding_cost_per_unit' => $def['holdCost'],
                'currency_code' => 'PHP',
            ], $manager);
        }

        $this->info('3. Generating realistic 30-day historical sales dataset for SMA...');
        $saleIndex = 0;
        $cashiers = [$staff, $manager];

        for ($daysAgo = 30; $daysAgo >= 1; $daysAgo--) {
            foreach ($productsDef as $sku => $def) {
                [$minDaily, $maxDaily] = $def['dailySales'];
                $qty = random_int($minDaily, $maxDaily);
                if ($qty <= 0) {
                    continue;
                }

                $product = $products[$sku];
                $soldAt = now()->subDays($daysAgo)->setTime(random_int(8, 17), random_int(0, 59));
                $unitPrice = (string) $product->selling_price;
                $gross = bcmul((string) $qty, $unitPrice, 4);
                $taxAmount = bcdiv(bcmul($gross, '12', 6), '100', 4);
                $total = bcadd($gross, $taxAmount, 4);
                $saleId = DB::table('sales')->insertGetId([
                    'branch_id' => $branch->id,
                    'sale_number' => 'SALE-'.strtoupper(Str::random(10)),
                    'status' => 'completed',
                    'currency_code' => 'PHP',
                    'sold_at' => $soldAt,
                    'completed_at' => $soldAt,
                    'subtotal_amount' => $gross,
                    'discount_amount' => '0.0000',
                    'tax_amount' => $taxAmount,
                    'total_amount' => $total,
                    'cashier_user_id' => $cashiers[$saleIndex % 2]->id,
                    'idempotency_key' => 'SEED-SALE-'.(string) Str::uuid(),
                    'correlation_id' => (string) Str::uuid(),
                    'row_version' => 1,
                    'created_at' => $soldAt,
                ]);

                DB::table('sale_lines')->insert([
                    'sale_id' => $saleId,
                    'line_number' => 1,
                    'product_id' => $product->id,
                    'unit_id' => $product->stock_unit_id,
                    'product_sku_snapshot' => $product->sku,
                    'product_name_snapshot' => $product->name,
                    'quantity' => (string) $qty,
                    'stock_quantity_delta' => (string) $qty,
                    'unit_price' => $unitPrice,
                    'discount_amount' => '0.0000',
                    'tax_rate' => '12.0000',
                    'tax_amount' => $taxAmount,
                    'line_total_amount' => $total,
                    'created_at' => $soldAt,
                ]);

                DB::table('sale_payments')->insert([
                    'sale_id' => $saleId,
                    'payment_method' => 'cash',
                    'amount' => $total,
                    'currency_code' => 'PHP',
                    'received_at' => $soldAt,
                    'created_at' => $soldAt,
                ]);

                $saleIndex++;
            }
        }

        $this->info('4. Running SMA Demand Forecasting over 14-day window...');
        $forecastService->createRun([
            'branch_id' => $branch->id,
            'period_grain' => 'daily',
            'window_periods' => 14,
            'history_start_date' => now()->subDays(14)->toDateString(),
            'history_end_date' => now()->subDays(1)->toDateString(),
        ], $owner);

        $this->info('5. Evaluating restocking alerts against policies...');
        $alerts = $alertService->evaluateAll($branch->id);

        $this->info("Done! SMA forecast computed, EOQ recommendations active, and {$alerts->count()} restocking alert(s) generated for client products.");

        return self::SUCCESS;
    }
}
