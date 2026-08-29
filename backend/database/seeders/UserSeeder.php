<?php

namespace Database\Seeders;

use App\Domains\Identity\Models\Branch;
use App\Domains\Identity\Models\Role;
use App\Domains\Identity\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Seeds the 3 official system users (Owner, Admin, Manager).
 */
class UserSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->isProduction()) {
            return;
        }

        $mainBranch = Branch::query()->where('code', 'MAIN')->first();
        $ownerRole = Role::query()->where('code', 'owner')->firstOrFail();
        $adminRole = Role::query()->where('code', 'admin')->firstOrFail();
        $managerRole = Role::query()->where('code', 'manager')->firstOrFail();

        // 1. Owner: Steven Kristoffer Destura
        $owner = User::query()->updateOrCreate(
            ['email' => 'owner@stevenhydrotech.example'],
            [
                'password_hash' => Hash::make('password123'),
                'first_name' => 'Steven Kristoffer',
                'last_name' => 'Destura',
                'display_name' => 'Steven Kristoffer Destura',
                'avatar_url' => 'https://api.dicebear.com/7.x/initials/svg?seed=Steven+Kristoffer+Destura',
                'is_active' => true,
                'email_verified_at' => now(),
            ],
        );

        $owner->roles()->sync([
            $ownerRole->id => ['effective_from' => now(), 'created_at' => now()],
        ]);

        if ($mainBranch) {
            $owner->branches()->syncWithoutDetaching([
                $mainBranch->id => ['is_default' => true, 'created_at' => now()],
            ]);
        }

        // 2. Admin: Danica Olario Cardel
        $admin = User::query()->updateOrCreate(
            ['email' => 'admin@stevenhydrotech.com'],
            [
                'password_hash' => Hash::make('password123'),
                'first_name' => 'Danica',
                'last_name' => 'Olario Cardel',
                'display_name' => 'Danica Olario Cardel',
                'avatar_url' => 'https://api.dicebear.com/7.x/initials/svg?seed=Danica+Olario+Cardel',
                'is_active' => true,
                'email_verified_at' => now(),
            ],
        );

        $admin->roles()->sync([
            $adminRole->id => ['effective_from' => now(), 'created_at' => now()],
        ]);

        if ($mainBranch) {
            $admin->branches()->syncWithoutDetaching([
                $mainBranch->id => ['is_default' => true, 'created_at' => now()],
            ]);
        }

        // 3. Manager: Elmer Ella
        $manager = User::query()->updateOrCreate(
            ['email' => 'manager@stevenhydrotech.example'],
            [
                'password_hash' => Hash::make('password123'),
                'first_name' => 'Elmer',
                'last_name' => 'Ella',
                'display_name' => 'Elmer Ella',
                'avatar_url' => 'https://api.dicebear.com/7.x/initials/svg?seed=Elmer+Ella',
                'is_active' => true,
                'email_verified_at' => now(),
            ],
        );

        $manager->roles()->sync([
            $managerRole->id => ['effective_from' => now(), 'created_at' => now()],
        ]);

        if ($mainBranch) {
            $manager->branches()->syncWithoutDetaching([
                $mainBranch->id => ['is_default' => true, 'created_at' => now()],
            ]);
        }
    }
}
