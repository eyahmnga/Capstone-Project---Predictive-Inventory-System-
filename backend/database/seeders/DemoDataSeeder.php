<?php

namespace Database\Seeders;

use App\Domains\Catalog\Models\Category;
use App\Domains\Catalog\Models\Product;
use App\Domains\Catalog\Models\UnitOfMeasure;
use App\Domains\Identity\Models\Branch;
use App\Domains\Identity\Models\Role;
use App\Domains\Identity\Models\User;
use App\Domains\Inventory\Services\GoodsReceiptService;
use App\Domains\Inventory\Services\InventoryAdjustmentService;
use App\Domains\Planning\Models\ReorderPolicy;
use App\Domains\Planning\Services\EoqService;
use App\Domains\Planning\Services\RestockingAlertService;
use App\Domains\Planning\Services\SmaForecastService;
use App\Domains\Procurement\Models\PurchaseOrder;
use App\Domains\Procurement\Models\Supplier;
use App\Domains\Procurement\Services\PurchaseOrderService;
use App\Domains\Sales\Services\SaleService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Populates every transactional domain with realistic, comprehensive
 * water-treatment demo data across 5 distinct categories (25 products total),
 * showcasing SMA demand forecasting, EOQ optimization, Reorder Policies,
 * and active Low Stock, Out of Stock, and Overstock states.
 */
class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->isProduction()) {
            return;
        }

        // Idempotency guard: skip if already populated
        if (Product::query()->where('sku', 'SHX-FLT-001')->exists()) {
            return;
        }

        $branch = Branch::query()->where('code', 'MAIN')->firstOrFail();
        $units = UnitOfMeasure::query()->get()->keyBy('code');
        $owner = User::query()
            ->where('email', env('OWNER_SEED_EMAIL', 'owner@stevenhydrotech.example'))
            ->firstOrFail();

        $users = $this->seedDemoUsers($branch);
        $categories = $this->seedCategories();
        $suppliers = $this->seedSuppliers();
        $products = $this->seedProducts($categories, $units);

        $this->seedPurchaseOrdersAndReceipts($branch, $suppliers, $products, $users['manager'], $owner, $units);
        $this->seedInventoryAdjustments($branch, $products, $users['manager'], $owner);
        $this->seedSales($branch, $products, $users['staffOne'], $users['staffTwo'], $units);
        $this->seedReorderPoliciesAndEoq($branch, $products, $users['manager']);

        app(RestockingAlertService::class)->evaluateAll($branch->id);

        $this->runForecast($branch, $owner);
    }

    /**
     * @return array{manager: User, staffOne: User, staffTwo: User}
     */
    private function seedDemoUsers(Branch $branch): array
    {
        $managerRole = Role::query()->where('code', 'manager')->firstOrFail();
        $staffRole = Role::query()->where('code', 'staff')->firstOrFail();

        return [
            'manager' => $this->seedUser('marco.villareal@stevenhydrotech.example', 'Marco', 'Villareal', $managerRole, $branch),
            'staffOne' => $this->seedUser('grace.dizon@stevenhydrotech.example', 'Grace', 'Dizon', $staffRole, $branch),
            'staffTwo' => $this->seedUser('paolo.reyes@stevenhydrotech.example', 'Paolo', 'Reyes', $staffRole, $branch),
        ];
    }

    private function seedUser(string $email, string $firstName, string $lastName, Role $role, Branch $branch): User
    {
        $displayName = "{$firstName} {$lastName}";

        $user = User::query()->updateOrCreate(
            ['email' => $email],
            [
                'password_hash' => Hash::make('ChangeMe!12345'),
                'first_name' => $firstName,
                'last_name' => $lastName,
                'display_name' => $displayName,
                'avatar_url' => 'https://api.dicebear.com/7.x/initials/svg?seed='.urlencode($displayName),
                'is_active' => true,
                'email_verified_at' => now(),
            ],
        );

        $user->roles()->syncWithoutDetaching([$role->id => ['effective_from' => now(), 'created_at' => now()]]);
        $user->branches()->syncWithoutDetaching([$branch->id => ['is_default' => true, 'created_at' => now()]]);

        return $user;
    }

    /**
     * @return array<string, Category>
     */
    private function seedCategories(): array
    {
        $definitions = [
            'FILT' => ['name' => 'Water Filtration & Cartridges', 'description' => 'Sediment filters, carbon blocks, and reverse osmosis membrane elements.'],
            'CHEM' => ['name' => 'Water Treatment Chemicals', 'description' => 'Disinfectants, coagulants, pH adjusters, and softening salts.'],
            'PUMP' => ['name' => 'Pumps & Pressure Tanks', 'description' => 'Booster pumps, diaphragm pumps, pressure vessels, and flow controllers.'],
            'FITT' => ['name' => 'Fittings, Valves & Pipes', 'description' => 'Push-fit connectors, solenoid valves, check valves, and pressure gauges.'],
            'TEST' => ['name' => 'Water Testing & Instruments', 'description' => 'Digital TDS meters, pH testing drops, hardness test kits, and flow meters.'],
        ];

        $categories = [];
        foreach ($definitions as $code => $definition) {
            $categories[$code] = Category::query()->updateOrCreate(
                ['code' => $code],
                ['name' => $definition['name'], 'description' => $definition['description'], 'is_active' => true, 'row_version' => 1],
            );
        }

        return $categories;
    }

    /**
     * @return array<string, Supplier>
     */
    private function seedSuppliers(): array
    {
        $definitions = [
            'AQUAPRO' => ['name' => 'AquaPro Water Systems Inc.', 'email' => 'sales@aquapro.example.ph', 'phone' => '0917-555-0101', 'city' => 'Quezon City', 'tax' => '201-455-890-000'],
            'CHEMFLOW' => ['name' => 'ChemFlow Industrial Solutions Corp.', 'email' => 'orders@chemflow.example.ph', 'phone' => '0918-555-0202', 'city' => 'Manila', 'tax' => '304-889-112-000'],
            'HYDROTECH' => ['name' => 'HydroTech Filtration Supply', 'email' => 'contact@hydrotechsupply.example.ph', 'phone' => '0920-555-0303', 'city' => 'Pasig City', 'tax' => '409-123-776-000'],
            'FLOWMAX' => ['name' => 'FlowMax Valves & Pumps Ltd.', 'email' => 'support@flowmax.example.ph', 'phone' => '0922-555-0404', 'city' => 'Valenzuela City', 'tax' => '501-998-334-000'],
            'PRECISION' => ['name' => 'Precision Water Instruments Co.', 'email' => 'sales@precisioninstruments.example.ph', 'phone' => '0925-555-0505', 'city' => 'Cebu City', 'tax' => '602-334-889-000'],
        ];

        $suppliers = [];
        foreach ($definitions as $code => $info) {
            $suppliers[$code] = Supplier::query()->updateOrCreate(
                ['code' => $code],
                [
                    'legal_name' => $info['name'],
                    'tax_identifier' => $info['tax'],
                    'email' => $info['email'],
                    'phone' => $info['phone'],
                    'city' => $info['city'],
                    'country_code' => 'PH',
                    'default_currency_code' => 'PHP',
                    'is_active' => true,
                    'row_version' => 1,
                ],
            );
        }

        return $suppliers;
    }

    /**
     * @param array<string, Category> $categories
     * @param \Illuminate\Support\Collection<string, UnitOfMeasure> $units
     * @return array<string, Product>
     */
    private function seedProducts(array $categories, $units): array
    {
        $definitions = [
            // Category 1: Water Filtration & Cartridges
            ['sku' => 'SHX-FLT-001', 'category' => 'FILT', 'unit' => 'EA', 'name' => '10-inch 5-Micron Sediment Filter', 'price' => '220.0000', 'lead' => '5.00', 'lot' => false, 'exp' => false],
            ['sku' => 'SHX-FLT-002', 'category' => 'FILT', 'unit' => 'EA', 'name' => '10-inch CTO Carbon Block Cartridge', 'price' => '350.0000', 'lead' => '5.00', 'lot' => false, 'exp' => false],
            ['sku' => 'SHX-FLT-003', 'category' => 'FILT', 'unit' => 'EA', 'name' => '10-inch GAC Granular Activated Carbon', 'price' => '380.0000', 'lead' => '7.00', 'lot' => false, 'exp' => false],
            ['sku' => 'SHX-FLT-004', 'category' => 'FILT', 'unit' => 'EA', 'name' => '75 GPD Residential RO Membrane Element', 'price' => '1450.0000', 'lead' => '7.00', 'lot' => true, 'exp' => false],
            ['sku' => 'SHX-FLT-005', 'category' => 'FILT', 'unit' => 'EA', 'name' => 'Alkaline Mineral & Post-Carbon Filter', 'price' => '480.0000', 'lead' => '5.00', 'lot' => false, 'exp' => false],

            // Category 2: Water Treatment Chemicals
            ['sku' => 'SHX-CHM-001', 'category' => 'CHEM', 'unit' => 'KG', 'name' => 'Calcium Hypochlorite 70% Chlorine Granules', 'price' => '280.0000', 'lead' => '4.00', 'lot' => true, 'exp' => true],
            ['sku' => 'SHX-CHM-002', 'category' => 'CHEM', 'unit' => 'L', 'name' => 'Liquid Algaecide & Clarifier Solution', 'price' => '450.0000', 'lead' => '4.00', 'lot' => true, 'exp' => true],
            ['sku' => 'SHX-CHM-003', 'category' => 'CHEM', 'unit' => 'KG', 'name' => 'pH Booster Soda Ash Dense Grade', 'price' => '190.0000', 'lead' => '3.00', 'lot' => true, 'exp' => false],
            ['sku' => 'SHX-CHM-004', 'category' => 'CHEM', 'unit' => 'KG', 'name' => 'PAC Polyaluminium Chloride Coagulant', 'price' => '320.0000', 'lead' => '5.00', 'lot' => true, 'exp' => true],
            ['sku' => 'SHX-CHM-005', 'category' => 'CHEM', 'unit' => 'BAG', 'name' => 'High-Purity Water Softener Salt Pellets (25kg)', 'price' => '650.0000', 'lead' => '3.00', 'lot' => false, 'exp' => false],

            // Category 3: Pumps & Pressure Tanks
            ['sku' => 'SHX-PMP-001', 'category' => 'PUMP', 'unit' => 'EA', 'name' => '1.0 HP Multi-Stage Water Booster Pump', 'price' => '6800.0000', 'lead' => '10.00', 'lot' => false, 'exp' => false],
            ['sku' => 'SHX-PMP-002', 'category' => 'PUMP', 'unit' => 'EA', 'name' => '24V DC Reverse Osmosis Booster Pump 75GPD', 'price' => '1850.0000', 'lead' => '7.00', 'lot' => false, 'exp' => false],
            ['sku' => 'SHX-PMP-003', 'category' => 'PUMP', 'unit' => 'EA', 'name' => '24-Liter Heavy Duty Diaphragm Pressure Tank', 'price' => '3200.0000', 'lead' => '7.00', 'lot' => false, 'exp' => false],
            ['sku' => 'SHX-PMP-004', 'category' => 'PUMP', 'unit' => 'EA', 'name' => 'Electronic Automatic Pump Flow Control Switch', 'price' => '1250.0000', 'lead' => '5.00', 'lot' => false, 'exp' => false],
            ['sku' => 'SHX-PMP-005', 'category' => 'PUMP', 'unit' => 'EA', 'name' => '0.5 HP Stainless Submersible Deep Well Pump', 'price' => '5400.0000', 'lead' => '12.00', 'lot' => false, 'exp' => false],

            // Category 4: Fittings, Valves & Pipes
            ['sku' => 'SHX-FIT-001', 'category' => 'FITT', 'unit' => 'EA', 'name' => '1/4-inch Push-Fit Quick Connect Male Adapter', 'price' => '45.0000', 'lead' => '3.00', 'lot' => false, 'exp' => false],
            ['sku' => 'SHX-FIT-002', 'category' => 'FITT', 'unit' => 'EA', 'name' => '1/2-inch Electric Brass Solenoid Valve 220V', 'price' => '850.0000', 'lead' => '7.00', 'lot' => false, 'exp' => false],
            ['sku' => 'SHX-FIT-003', 'category' => 'FITT', 'unit' => 'EA', 'name' => 'Heavy Duty PVC True Union Ball Valve 1-inch', 'price' => '280.0000', 'lead' => '4.00', 'lot' => false, 'exp' => false],
            ['sku' => 'SHX-FIT-004', 'category' => 'FITT', 'unit' => 'EA', 'name' => 'Stainless Steel Non-Return Spring Check Valve', 'price' => '420.0000', 'lead' => '5.00', 'lot' => false, 'exp' => false],
            ['sku' => 'SHX-FIT-005', 'category' => 'FITT', 'unit' => 'EA', 'name' => 'Glycerin-Filled Pressure Gauge 0-100 PSI', 'price' => '490.0000', 'lead' => '5.00', 'lot' => false, 'exp' => false],

            // Category 5: Water Testing & Instruments
            ['sku' => 'SHX-TST-001', 'category' => 'TEST', 'unit' => 'EA', 'name' => 'Digital TDS & Temperature Handheld Meter', 'price' => '550.0000', 'lead' => '5.00', 'lot' => false, 'exp' => false],
            ['sku' => 'SHX-TST-002', 'category' => 'TEST', 'unit' => 'BOX', 'name' => 'Rapid pH & Chlorine Reagent Dropper Test Kit', 'price' => '680.0000', 'lead' => '5.00', 'lot' => true, 'exp' => true],
            ['sku' => 'SHX-TST-003', 'category' => 'TEST', 'unit' => 'BOX', 'name' => 'Total Water Hardness Titration Test Kit', 'price' => '1200.0000', 'lead' => '7.00', 'lot' => true, 'exp' => true],
            ['sku' => 'SHX-TST-004', 'category' => 'TEST', 'unit' => 'EA', 'name' => 'Digital Pulse Water Turbine Flow Meter 1/2-inch', 'price' => '1950.0000', 'lead' => '10.00', 'lot' => false, 'exp' => false],
            ['sku' => 'SHX-TST-005', 'category' => 'TEST', 'unit' => 'EA', 'name' => 'Pocket Salinity / Conductivity Tester Pen', 'price' => '1450.0000', 'lead' => '7.00', 'lot' => false, 'exp' => false],
        ];

        $products = [];
        foreach ($definitions as $def) {
            $unitModel = $units->get($def['unit']) ?? $units->first();

            $products[$def['sku']] = Product::query()->create([
                'category_id' => $categories[$def['category']]->id,
                'stock_unit_id' => $unitModel->id,
                'sku' => $def['sku'],
                'name' => $def['name'],
                'description' => "Commercial and residential water treatment grade {$def['name']}.",
                'image_url' => "https://picsum.photos/seed/{$def['sku']}/600/600",
                'product_type' => 'stock',
                'default_tax_rate' => '12.0000',
                'selling_price' => $def['price'],
                'default_lead_time_days' => $def['lead'],
                'is_active' => true,
                'is_lot_tracked' => $def['lot'],
                'is_serial_tracked' => false,
                'is_expiry_tracked' => $def['exp'],
                'row_version' => 1,
            ]);
        }

        return $products;
    }

    /**
     * @param array<string, Supplier> $suppliers
     * @param array<string, Product> $products
     * @param \Illuminate\Support\Collection<string, UnitOfMeasure> $units
     */
    private function seedPurchaseOrdersAndReceipts(Branch $branch, array $suppliers, array $products, User $manager, User $owner, $units): void
    {
        $poService = app(PurchaseOrderService::class);
        $grService = app(GoodsReceiptService::class);

        // PO 1: Main bulk receiving (creates healthy base stocks + overstocked salt & fittings)
        $po1 = $this->createDraftPo($poService, $branch, $suppliers['AQUAPRO'], $manager, $products, [
            ['sku' => 'SHX-FLT-001', 'qty' => '120', 'cost' => '130.0000'],
            ['sku' => 'SHX-FLT-002', 'qty' => '90', 'cost' => '210.0000'],
            ['sku' => 'SHX-FLT-004', 'qty' => '40', 'cost' => '950.0000'],
            ['sku' => 'SHX-FLT-005', 'qty' => '60', 'cost' => '280.0000'],
        ]);
        $poService->submit($po1, $manager, (string) Str::uuid());
        $poService->decide($po1, 'approved', null, $owner, (string) Str::uuid());
        $poService->markOrdered($po1, now()->subDays(55), 'PO-AQ-01', $manager, (string) Str::uuid());
        $this->receiveFullPo($grService, $po1, $branch, $manager, now()->subDays(50));

        // PO 2: Chemicals receiving (includes overstocked salt & moderate chemicals)
        $po2 = $this->createDraftPo($poService, $branch, $suppliers['CHEMFLOW'], $manager, $products, [
            ['sku' => 'SHX-CHM-002', 'qty' => '30', 'cost' => '280.0000'],
            ['sku' => 'SHX-CHM-003', 'qty' => '50', 'cost' => '110.0000'],
            ['sku' => 'SHX-CHM-004', 'qty' => '40', 'cost' => '190.0000'],
            ['sku' => 'SHX-CHM-005', 'qty' => '250', 'cost' => '420.0000'], // OVERSTOCK
        ]);
        $poService->submit($po2, $manager, (string) Str::uuid());
        $poService->decide($po2, 'approved', null, $owner, (string) Str::uuid());
        $poService->markOrdered($po2, now()->subDays(45), 'PO-CF-01', $manager, (string) Str::uuid());
        $this->receiveFullPo($grService, $po2, $branch, $manager, now()->subDays(40));

        // PO 3: Pumps & Pressure Tanks receiving
        $po3 = $this->createDraftPo($poService, $branch, $suppliers['FLOWMAX'], $manager, $products, [
            ['sku' => 'SHX-PMP-001', 'qty' => '12', 'cost' => '4500.0000'],
            ['sku' => 'SHX-PMP-003', 'qty' => '15', 'cost' => '2100.0000'],
            ['sku' => 'SHX-PMP-004', 'qty' => '25', 'cost' => '750.0000'],
        ]);
        $poService->submit($po3, $manager, (string) Str::uuid());
        $poService->decide($po3, 'approved', null, $owner, (string) Str::uuid());
        $poService->markOrdered($po3, now()->subDays(35), 'PO-FM-01', $manager, (string) Str::uuid());
        $this->receiveFullPo($grService, $po3, $branch, $manager, now()->subDays(30));

        // PO 4: Fittings & Valves (Includes overstocked Ball Valves)
        $po4 = $this->createDraftPo($poService, $branch, $suppliers['FLOWMAX'], $manager, $products, [
            ['sku' => 'SHX-FIT-001', 'qty' => '100', 'cost' => '25.0000'],
            ['sku' => 'SHX-FIT-002', 'qty' => '30', 'cost' => '520.0000'],
            ['sku' => 'SHX-FIT-003', 'qty' => '180', 'cost' => '160.0000'], // OVERSTOCK
            ['sku' => 'SHX-FIT-004', 'qty' => '40', 'cost' => '250.0000'],
            ['sku' => 'SHX-FIT-005', 'qty' => '45', 'cost' => '290.0000'],
        ]);
        $poService->submit($po4, $manager, (string) Str::uuid());
        $poService->decide($po4, 'approved', null, $owner, (string) Str::uuid());
        $poService->markOrdered($po4, now()->subDays(25), 'PO-FM-02', $manager, (string) Str::uuid());
        $this->receiveFullPo($grService, $po4, $branch, $manager, now()->subDays(20));

        // PO 5: Testing Instruments
        $po5 = $this->createDraftPo($poService, $branch, $suppliers['PRECISION'], $manager, $products, [
            ['sku' => 'SHX-TST-001', 'qty' => '35', 'cost' => '320.0000'],
            ['sku' => 'SHX-TST-002', 'qty' => '40', 'cost' => '390.0000'],
            ['sku' => 'SHX-TST-004', 'qty' => '15', 'cost' => '1150.0000'],
            ['sku' => 'SHX-TST-005', 'qty' => '20', 'cost' => '850.0000'],
        ]);
        $poService->submit($po5, $manager, (string) Str::uuid());
        $poService->decide($po5, 'approved', null, $owner, (string) Str::uuid());
        $poService->markOrdered($po5, now()->subDays(20), 'PO-PI-01', $manager, (string) Str::uuid());
        $this->receiveFullPo($grService, $po5, $branch, $manager, now()->subDays(15));

        // PO 6: Thin receiving to create deliberate LOW STOCK items
        $po6 = $this->createDraftPo($poService, $branch, $suppliers['HYDROTECH'], $manager, $products, [
            ['sku' => 'SHX-FLT-003', 'qty' => '12', 'cost' => '230.0000'], // Low Stock (ROP 20)
            ['sku' => 'SHX-CHM-001', 'qty' => '10', 'cost' => '170.0000'], // Low Stock (ROP 18)
        ]);
        $poService->submit($po6, $manager, (string) Str::uuid());
        $poService->decide($po6, 'approved', null, $owner, (string) Str::uuid());
        $poService->markOrdered($po6, now()->subDays(10), 'PO-HT-01', $manager, (string) Str::uuid());
        $this->receiveFullPo($grService, $po6, $branch, $manager, now()->subDays(7));

        // Note: Products 'SHX-PMP-002' (RO Diaphragm Pump), 'SHX-PMP-005' (Submersible Pump), and 'SHX-TST-003' (Hardness Test Kit)
        // are NEVER received, so their on-hand balance remains 0.0000 -> Deliberate OUT OF STOCK demonstration!
    }

    /**
     * @param array<string, Product> $products
     * @param array<int, array{sku: string, qty: string, cost: string}> $lineDefs
     */
    private function createDraftPo(PurchaseOrderService $poService, Branch $branch, Supplier $supplier, User $actor, array $products, array $lineDefs): PurchaseOrder
    {
        $lines = array_map(fn ($lineDef) => [
            'product_id' => $products[$lineDef['sku']]->id,
            'unit_id' => $products[$lineDef['sku']]->stock_unit_id,
            'ordered_quantity' => $lineDef['qty'],
            'unit_cost' => $lineDef['cost'],
            'tax_rate' => '12',
        ], $lineDefs);

        return $poService->createDraft([
            'branch_id' => $branch->id,
            'supplier_id' => $supplier->id,
            'currency_code' => 'PHP',
            'lines' => $lines,
        ], $actor, (string) Str::uuid());
    }

    private function receiveFullPo(GoodsReceiptService $grService, PurchaseOrder $po, Branch $branch, User $actor, \DateTimeInterface $receivedAt): void
    {
        $po->refresh()->load('lines.product');

        $lines = $po->lines->map(fn ($line) => [
            'purchase_order_line_id' => $line->id,
            'received_quantity' => $line->ordered_quantity,
            'accepted_quantity' => $line->ordered_quantity,
            'rejected_quantity' => '0.0000',
            'lot_number' => $line->product->is_lot_tracked ? 'LOT-'.now()->format('Ymd').'-'.$line->id : null,
            'expiry_date' => $line->product->is_expiry_tracked ? now()->addMonths(24)->toDateString() : null,
        ])->all();

        $receipt = $grService->createDraft([
            'purchase_order_id' => $po->id,
            'branch_id' => $branch->id,
            'received_at' => $receivedAt,
            'lines' => $lines,
        ], $actor, (string) Str::uuid());

        $grService->post($receipt, $actor, (string) Str::uuid());
    }

    /**
     * @param array<string, Product> $products
     */
    private function seedInventoryAdjustments(Branch $branch, array $products, User $manager, User $owner): void
    {
        $adjService = app(InventoryAdjustmentService::class);

        // Adjustment 1: Physical count found +5 sediment filters
        $adj1 = $adjService->createDraft([
            'branch_id' => $branch->id,
            'reason_code' => 'stock_count_correction',
            'reason_note' => 'Quarterly physical audit found extra unlogged filter units.',
            'effective_at' => now()->subDays(12),
            'lines' => [[
                'product_id' => $products['SHX-FLT-001']->id,
                'quantity_delta' => '5.0000',
                'unit_cost' => '130.0000',
            ]],
        ], $manager, (string) Str::uuid());
        $adjService->approve($adj1, $owner, (string) Str::uuid());
        $adjService->post($adj1, $manager, (string) Str::uuid());
    }

    /**
     * @param array<string, Product> $products
     * @param \Illuminate\Support\Collection<string, UnitOfMeasure> $units
     */
    private function seedSales(Branch $branch, array $products, User $staffOne, User $staffTwo, $units): void
    {
        $saleService = app(SaleService::class);
        $cashiers = [$staffOne, $staffTwo];

        // Active selling pool of products
        $salesPool = [
            'SHX-FLT-001' => ['dailyMin' => 1, 'dailyMax' => 4, 'unitPrice' => '220.0000'],
            'SHX-FLT-002' => ['dailyMin' => 1, 'dailyMax' => 3, 'unitPrice' => '350.0000'],
            'SHX-FLT-003' => ['dailyMin' => 1, 'dailyMax' => 2, 'unitPrice' => '380.0000'],
            'SHX-FLT-004' => ['dailyMin' => 0, 'dailyMax' => 2, 'unitPrice' => '1450.0000'],
            'SHX-FLT-005' => ['dailyMin' => 1, 'dailyMax' => 3, 'unitPrice' => '480.0000'],
            'SHX-CHM-001' => ['dailyMin' => 0, 'dailyMax' => 2, 'unitPrice' => '280.0000'],
            'SHX-CHM-002' => ['dailyMin' => 0, 'dailyMax' => 2, 'unitPrice' => '450.0000'],
            'SHX-FIT-001' => ['dailyMin' => 2, 'dailyMax' => 5, 'unitPrice' => '45.0000'],
            'SHX-TST-001' => ['dailyMin' => 1, 'dailyMax' => 2, 'unitPrice' => '550.0000'],
            'SHX-TST-002' => ['dailyMin' => 1, 'dailyMax' => 2, 'unitPrice' => '680.0000'],
        ];

        $saleIndex = 0;

        // Generate sales across past 40 days to give SMA a rich dataset
        for ($daysAgo = 40; $daysAgo >= 1; $daysAgo--) {
            $transactionsToday = random_int(1, 3);
            for ($t = 0; $t < $transactionsToday; $t++) {
                $sku = array_rand($salesPool);
                $config = $salesPool[$sku];
                $product = $products[$sku];

                $qty = random_int($config['dailyMin'], $config['dailyMax']);
                if ($qty <= 0) {
                    continue;
                }

                $soldAt = now()->subDays($daysAgo)->setTime(random_int(8, 18), random_int(0, 59));
                $this->recordSale($saleService, $branch, $product, (string) $qty, $cashiers[$saleIndex % 2], $soldAt, ++$saleIndex);
            }
        }

        // Today's completed sales for live dashboard KPIs
        foreach (['SHX-FLT-001', 'SHX-FLT-002', 'SHX-TST-001'] as $sku) {
            $product = $products[$sku];
            $soldAt = now()->subHours(random_int(1, 5));
            $this->recordSale($saleService, $branch, $product, '2.0000', $cashiers[$saleIndex % 2], $soldAt, ++$saleIndex);
        }
    }

    private function recordSale(SaleService $saleService, Branch $branch, Product $product, string $quantity, User $cashier, \DateTimeInterface $soldAt, int $saleIndex): void
    {
        $unitPrice = (string) $product->selling_price;
        $gross = bcmul($quantity, $unitPrice, 4);
        $taxAmount = bcdiv(bcmul($gross, '12', 6), '100', 4);
        $total = bcadd($gross, $taxAmount, 4);

        $saleService->finalize([
            'branch_id' => $branch->id,
            'currency_code' => 'PHP',
            'sold_at' => $soldAt,
            'idempotency_key' => 'SEED-SALE-'.$saleIndex,
            'lines' => [[
                'product_id' => $product->id,
                'unit_id' => $product->stock_unit_id,
                'quantity' => $quantity,
            ]],
            'payments' => [[
                'payment_method' => 'cash',
                'amount' => $total,
            ]],
        ], $cashier, (string) Str::uuid());
    }

    /**
     * @param array<string, Product> $products
     */
    private function seedReorderPoliciesAndEoq(Branch $branch, array $products, User $manager): void
    {
        $eoqService = app(EoqService::class);

        // Reorder Policies configured for each category to demonstrate Low Stock, Out of Stock, and Optimal
        $policies = [
            // Low stock triggers (ROP > current stock)
            'SHX-FLT-003' => ['safety' => '10.0000', 'basis' => 'policy_minimum', 'rop' => '20.0000', 'annualD' => '600', 'orderCost' => '450', 'holdCost' => '35'],
            'SHX-CHM-001' => ['safety' => '8.0000', 'basis' => 'service_level', 'rop' => '18.0000', 'annualD' => '450', 'orderCost' => '500', 'holdCost' => '25'],

            // Out of stock triggers (0 on hand, ROP active)
            'SHX-PMP-002' => ['safety' => '5.0000', 'basis' => 'policy_minimum', 'rop' => '12.0000', 'annualD' => '150', 'orderCost' => '800', 'holdCost' => '90'],
            'SHX-TST-003' => ['safety' => '6.0000', 'basis' => 'policy_minimum', 'rop' => '15.0000', 'annualD' => '200', 'orderCost' => '600', 'holdCost' => '80'],

            // Healthy / Optimal stock
            'SHX-FLT-001' => ['safety' => '15.0000', 'basis' => 'policy_minimum', 'rop' => '30.0000', 'annualD' => '1200', 'orderCost' => '500', 'holdCost' => '20'],
            'SHX-FLT-002' => ['safety' => '12.0000', 'basis' => 'policy_minimum', 'rop' => '25.0000', 'annualD' => '850', 'orderCost' => '450', 'holdCost' => '30'],
            'SHX-FIT-001' => ['safety' => '20.0000', 'basis' => 'policy_minimum', 'rop' => '35.0000', 'annualD' => '2400', 'orderCost' => '300', 'holdCost' => '5'],
            'SHX-TST-001' => ['safety' => '8.0000', 'basis' => 'manual_override', 'rop' => '16.0000', 'annualD' => '350', 'orderCost' => '400', 'holdCost' => '45'],

            // Overstocked products
            'SHX-CHM-005' => ['safety' => '15.0000', 'basis' => 'policy_minimum', 'rop' => '25.0000', 'annualD' => '1000', 'orderCost' => '600', 'holdCost' => '40'],
            'SHX-FIT-003' => ['safety' => '10.0000', 'basis' => 'policy_minimum', 'rop' => '20.0000', 'annualD' => '500', 'orderCost' => '350', 'holdCost' => '20'],
        ];

        foreach ($policies as $sku => $config) {
            $product = $products[$sku];

            $policy = ReorderPolicy::query()->updateOrCreate(
                ['branch_id' => $branch->id, 'product_id' => $product->id],
                [
                    'safety_stock_quantity' => $config['safety'],
                    'safety_stock_basis' => $config['basis'],
                    'reorder_point_quantity' => $config['rop'],
                    'rop_calculated_at' => now(),
                    'is_active' => true,
                    'row_version' => 1,
                    'created_by_user_id' => $manager->id,
                    'updated_by_user_id' => $manager->id,
                ],
            );

            // Pre-seed calculated EOQ snapshot for instant recommendations demonstration
            $eoqService->calculate($policy, [
                'annual_demand_quantity' => $config['annualD'],
                'ordering_cost' => $config['orderCost'],
                'annual_holding_cost_per_unit' => $config['holdCost'],
                'currency_code' => 'PHP',
            ], $manager);
        }
    }

    private function runForecast(Branch $branch, User $owner): void
    {
        app(SmaForecastService::class)->createRun([
            'branch_id' => $branch->id,
            'period_grain' => 'daily',
            'window_periods' => 14,
            'history_start_date' => now()->subDays(14)->toDateString(),
            'history_end_date' => now()->subDays(1)->toDateString(),
        ], $owner);
    }
}
