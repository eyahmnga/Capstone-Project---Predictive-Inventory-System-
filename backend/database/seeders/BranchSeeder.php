<?php

namespace Database\Seeders;

use App\Domains\Identity\Models\Branch;
use Illuminate\Database\Seeder;

class BranchSeeder extends Seeder
{
    public const BRANCHES = [
        [
            'code' => 'MAIN',
            'name' => 'Legazpi Branch',
            'address_line_1' => 'Rizal Street, Old Albay District',
            'city' => 'Legazpi City',
            'province' => 'Albay',
            'country_code' => 'PH',
            'phone' => '+63 917 123 4567',
            'is_active' => true,
        ],
        [
            'code' => 'BUD-WH',
            'name' => 'Budiao Warehouse',
            'address_line_1' => 'Budiao, Daraga',
            'city' => 'Daraga',
            'province' => 'Albay',
            'country_code' => 'PH',
            'phone' => '+63 918 765 4321',
            'is_active' => true,
        ],
    ];

    public function run(): void
    {
        foreach (self::BRANCHES as $branch) {
            Branch::query()->updateOrCreate(['code' => $branch['code']], $branch);
        }
    }
}
