<?php

namespace Database\Seeders;

use App\Domains\Catalog\Models\Category;
use App\Domains\Catalog\Models\Product;
use App\Domains\Catalog\Models\UnitOfMeasure;
use App\Domains\Identity\Models\Branch;
use App\Domains\Identity\Models\Role;
use App\Domains\Identity\Models\User;
use App\Domains\Inventory\Models\InventoryBalance;
use App\Domains\Planning\Models\ReorderPolicy;
use App\Domains\Planning\Services\RestockingAlertService;
use App\Domains\Procurement\Models\Supplier;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Populates official client catalog data for Steven Hydrotech Exponent:
 * Users, 8 distinct categories, 32 client products with exact pricing,
 * suppliers, and clean baseline stock levels and safety stock policies (no dummy history).
 */
class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->isProduction()) {
            return;
        }

        $branch = Branch::query()->where('code', 'MAIN')->firstOrFail();
        $units = UnitOfMeasure::query()->get()->keyBy('code');

        $users = $this->seedDemoUsers($branch);
        $categories = $this->seedCategories();
        $suppliers = $this->seedSuppliers();
        $products = $this->seedProducts($categories, $units);

        $this->seedInitialStockBalances($branch, $products);
    }

    /**
     * @return array{manager: User}
     */
    private function seedDemoUsers(Branch $branch): array
    {
        $managerRole = Role::query()->where('code', 'manager')->firstOrFail();

        return [
            'manager' => $this->seedUser('manager@stevenhydrotech.example', 'Elmer', 'Ella', $managerRole, $branch),
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
            'FILT' => ['name' => 'FILTERS', 'description' => 'Water filtration cartridges, carbon blocks, and slim filter vessels.'],
            'TANK' => ['name' => 'TANK', 'description' => 'FRP pressure vessels, multiport manual heads, and tank accessories.'],
            'WRS'  => ['name' => 'WATER REFILLING SUPPLIES', 'description' => 'Filter media: Manganese, Anthracite, Activated Carbon, Resin, Silica, and Pebbles.'],
            'PPR'  => ['name' => 'PPR FITTINGS', 'description' => 'PPR male adaptors, ball valves, union patente, elbows, and teflon tape.'],
            'PVC'  => ['name' => 'PVC FITTINGS', 'description' => 'PVC ball valves and standard plumbing fittings.'],
            'GAL'  => ['name' => 'GALLONS', 'description' => 'Slim gallon water containers and round caps.'],
            'SEAL' => ['name' => 'PLASTIC SEALER', 'description' => 'Faucet seals, umbrella seals, big cap seals, and small cap seals.'],
            'WIRE' => ['name' => 'WIRE', 'description' => 'Electrical liquid level switches, selector switches, and pressure gauges.'],
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
        $eachUnit = $units->get('EA') ?? $units->first();
        $bagUnit = $units->get('BAG') ?? $eachUnit;

        $definitions = [
            // Category 1: FILTERS (FILT)
            ['sku' => 'SHX-FLT-001', 'category' => 'FILT', 'unit' => 'EA', 'name' => '20-inch Slim Filter Vessel', 'price' => '600.0000', 'lead' => '5.00'],
            ['sku' => 'SHX-FLT-002', 'category' => 'FILT', 'unit' => 'EA', 'name' => 'Carbon Block Filter', 'price' => '500.0000', 'lead' => '5.00'],
            ['sku' => 'SHX-FLT-003', 'category' => 'FILT', 'unit' => 'EA', 'name' => 'Sediment Filter (5um & 1um)', 'price' => '100.0000', 'lead' => '5.00'],

            // Category 2: TANK (TANK)
            ['sku' => 'SHX-TNK-001', 'category' => 'TANK', 'unit' => 'EA', 'name' => '10x54 FRP Vessel (w/ tube & strainer)', 'price' => '2400.0000', 'lead' => '7.00'],
            ['sku' => 'SHX-TNK-002', 'category' => 'TANK', 'unit' => 'EA', 'name' => 'Manual Head (Softener)', 'price' => '1800.0000', 'lead' => '7.00'],
            ['sku' => 'SHX-TNK-003', 'category' => 'TANK', 'unit' => 'EA', 'name' => 'Manual Head (MMF/Standard)', 'price' => '1500.0000', 'lead' => '7.00'],
            ['sku' => 'SHX-TNK-004', 'category' => 'TANK', 'unit' => 'EA', 'name' => 'Used Manual Head', 'price' => '1000.0000', 'lead' => '7.00'],

            // Category 3: WATER REFILLING SUPPLIES (WRS)
            ['sku' => 'SHX-WRS-001', 'category' => 'WRS', 'unit' => 'BAG', 'name' => 'Manganese (MnO2)', 'price' => '3500.0000', 'lead' => '5.00'],
            ['sku' => 'SHX-WRS-002', 'category' => 'WRS', 'unit' => 'BAG', 'name' => 'Anthracite', 'price' => '1700.0000', 'lead' => '5.00'],
            ['sku' => 'SHX-WRS-003', 'category' => 'WRS', 'unit' => 'BAG', 'name' => 'Granular Activated Carbon (GAC)', 'price' => '1700.0000', 'lead' => '5.00'],
            ['sku' => 'SHX-WRS-004', 'category' => 'WRS', 'unit' => 'BAG', 'name' => 'Resin (Softener)', 'price' => '1600.0000', 'lead' => '5.00'],
            ['sku' => 'SHX-WRS-005', 'category' => 'WRS', 'unit' => 'BAG', 'name' => 'Silica Sand', 'price' => '600.0000', 'lead' => '3.00'],
            ['sku' => 'SHX-WRS-006', 'category' => 'WRS', 'unit' => 'BAG', 'name' => 'Pebbles', 'price' => '500.0000', 'lead' => '3.00'],

            // Category 4: PPR FITTINGS (PPR)
            ['sku' => 'SHX-PPR-001', 'category' => 'PPR', 'unit' => 'EA', 'name' => 'PPR Male Adaptor 1"', 'price' => '385.0000', 'lead' => '3.00'],
            ['sku' => 'SHX-PPR-002', 'category' => 'PPR', 'unit' => 'EA', 'name' => 'PPR Ball Valve 3/4', 'price' => '350.0000', 'lead' => '3.00'],
            ['sku' => 'SHX-PPR-003', 'category' => 'PPR', 'unit' => 'EA', 'name' => 'PPR Union Patente 3/4', 'price' => '85.0000', 'lead' => '3.00'],
            ['sku' => 'SHX-PPR-004', 'category' => 'PPR', 'unit' => 'EA', 'name' => 'PPR Union Patente 1/2', 'price' => '60.0000', 'lead' => '3.00'],
            ['sku' => 'SHX-PPR-005', 'category' => 'PPR', 'unit' => 'EA', 'name' => 'Male Adaptor 3/4', 'price' => '30.0000', 'lead' => '3.00'],
            ['sku' => 'SHX-PPR-006', 'category' => 'PPR', 'unit' => 'EA', 'name' => 'Elbow 3/4', 'price' => '25.0000', 'lead' => '3.00'],
            ['sku' => 'SHX-PPR-007', 'category' => 'PPR', 'unit' => 'EA', 'name' => 'PPR Elbow 1/2', 'price' => '15.0000', 'lead' => '3.00'],
            ['sku' => 'SHX-PPR-008', 'category' => 'PPR', 'unit' => 'EA', 'name' => 'Teflon Tape 3/4', 'price' => '15.0000', 'lead' => '2.00'],

            // Category 5: PVC FITTINGS (PVC)
            ['sku' => 'SHX-PVC-001', 'category' => 'PVC', 'unit' => 'EA', 'name' => 'PVC Ball Valve', 'price' => '300.0000', 'lead' => '3.00'],

            // Category 6: GALLONS (GAL)
            ['sku' => 'SHX-GAL-001', 'category' => 'GAL', 'unit' => 'EA', 'name' => 'Slim Gallon (5 Gallons)', 'price' => '130.0000', 'lead' => '3.00'],
            ['sku' => 'SHX-GAL-002', 'category' => 'GAL', 'unit' => 'EA', 'name' => 'Round Cap', 'price' => '10.0000', 'lead' => '2.00'],

            // Category 7: PLASTIC SEALER (SEAL)
            ['sku' => 'SHX-SEL-001', 'category' => 'SEAL', 'unit' => 'EA', 'name' => 'Faucet Seal (x1000)', 'price' => '125.0000', 'lead' => '3.00'],
            ['sku' => 'SHX-SEL-002', 'category' => 'SEAL', 'unit' => 'EA', 'name' => 'Big Cap Seal (x500)', 'price' => '120.0000', 'lead' => '3.00'],
            ['sku' => 'SHX-SEL-003', 'category' => 'SEAL', 'unit' => 'EA', 'name' => 'Umbrella Seal (x500)', 'price' => '120.0000', 'lead' => '3.00'],
            ['sku' => 'SHX-SEL-004', 'category' => 'SEAL', 'unit' => 'EA', 'name' => 'Small Cap Seal (x1000)', 'price' => '105.0000', 'lead' => '3.00'],
            ['sku' => 'SHX-SEL-005', 'category' => 'SEAL', 'unit' => 'EA', 'name' => 'Faucet Seal (x500)', 'price' => '60.0000', 'lead' => '3.00'],

            // Category 8: WIRE (WIRE)
            ['sku' => 'SHX-WIR-001', 'category' => 'WIRE', 'unit' => 'EA', 'name' => 'Liquid Level Switch', 'price' => '500.0000', 'lead' => '5.00'],
            ['sku' => 'SHX-WIR-002', 'category' => 'WIRE', 'unit' => 'EA', 'name' => 'Pressure Gauge (0–100 psi)', 'price' => '300.0000', 'lead' => '5.00'],
            ['sku' => 'SHX-WIR-003', 'category' => 'WIRE', 'unit' => 'EA', 'name' => 'Selector Switch', 'price' => '200.0000', 'lead' => '5.00'],
        ];

        $products = [];
        foreach ($definitions as $def) {
            $unitModel = $def['unit'] === 'BAG' ? $bagUnit : $eachUnit;

            $products[$def['sku']] = Product::query()->updateOrCreate(
                ['sku' => $def['sku']],
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
                    'is_lot_tracked' => false,
                    'is_serial_tracked' => false,
                    'is_expiry_tracked' => false,
                    'row_version' => 1,
                ],
            );
        }

        return $products;
    }

    /**
     * Sets baseline stock balances for all 32 products.
     *
     * @param array<string, Product> $products
     */
    private function seedInitialStockBalances(Branch $branch, array $products): void
    {
        foreach ($products as $product) {
            InventoryBalance::query()->updateOrCreate(
                ['branch_id' => $branch->id, 'product_id' => $product->id],
                [
                    'on_hand_quantity' => '20.0000',
                    'available_quantity' => '20.0000',
                    'reserved_quantity' => '0.0000',
                    'incoming_quantity' => '0.0000',
                    'last_movement_at' => null,
                    'row_version' => 1,
                ],
            );
        }
    }
}
