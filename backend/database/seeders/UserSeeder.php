<?php

namespace Database\Seeders;

use App\Domains\Identity\Models\Branch;
use App\Domains\Identity\Models\Role;
use App\Domains\Identity\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Seeds the standard system users (Owner, Manager, Staff) for local development and CI.
 */
class UserSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->isProduction()) {
            return;
        }

        $mainBranch = Branch::query()->where('code', 'MAIN')->first();

        // 1. Owner Account
        $ownerRole = Role::query()->where('code', 'owner')->firstOrFail();
        $ownerEmail = env('OWNER_SEED_EMAIL', 'owner@stevenhydrotech.example');
        $ownerPassword = env('OWNER_SEED_PASSWORD', 'ChangeMe!12345');
        $ownerDisplayName = 'Ella Mañaga';

        $owner = User::query()->updateOrCreate(
            ['email' => $ownerEmail],
            [
                'password_hash' => Hash::make($ownerPassword),
                'first_name' => 'Ella',
                'last_name' => 'Mañaga',
                'display_name' => $ownerDisplayName,
                'avatar_url' => 'https://api.dicebear.com/7.x/initials/svg?seed='.urlencode($ownerDisplayName),
                'is_active' => true,
                'email_verified_at' => now(),
            ],
        );

        $owner->roles()->syncWithoutDetaching([
            $ownerRole->id => ['effective_from' => now(), 'created_at' => now()],
        ]);

        if ($mainBranch) {
            $owner->branches()->syncWithoutDetaching([
                $mainBranch->id => ['is_default' => true, 'created_at' => now()],
            ]);
        }

        // Also alias admin@stevenhydrotech.com for convenience
        $admin = User::query()->updateOrCreate(
            ['email' => 'admin@stevenhydrotech.com'],
            [
                'password_hash' => Hash::make('password123'),
                'first_name' => 'Admin',
                'last_name' => 'User',
                'display_name' => 'Administrator',
                'avatar_url' => 'https://api.dicebear.com/7.x/initials/svg?seed=Admin',
                'is_active' => true,
                'email_verified_at' => now(),
            ],
        );
        $admin->roles()->syncWithoutDetaching([
            $ownerRole->id => ['effective_from' => now(), 'created_at' => now()],
        ]);
        if ($mainBranch) {
            $admin->branches()->syncWithoutDetaching([
                $mainBranch->id => ['is_default' => true, 'created_at' => now()],
            ]);
        }

        // 2. Manager Account
        $managerRole = Role::query()->where('code', 'manager')->first();
        if ($managerRole) {
            $manager = User::query()->updateOrCreate(
                ['email' => 'manager@stevenhydrotech.example'],
                [
                    'password_hash' => Hash::make('ChangeMe!12345'),
                    'first_name' => 'Marco',
                    'last_name' => 'Santos',
                    'display_name' => 'Marco Santos',
                    'avatar_url' => 'https://api.dicebear.com/7.x/initials/svg?seed=Marco+Santos',
                    'is_active' => true,
                    'email_verified_at' => now(),
                ],
            );
            $manager->roles()->syncWithoutDetaching([
                $managerRole->id => ['effective_from' => now(), 'created_at' => now()],
            ]);
            if ($mainBranch) {
                $manager->branches()->syncWithoutDetaching([
                    $mainBranch->id => ['is_default' => true, 'created_at' => now()],
                ]);
            }
        }

        // 3. Staff Account
        $staffRole = Role::query()->where('code', 'staff')->first();
        if ($staffRole) {
            $staff = User::query()->updateOrCreate(
                ['email' => 'staff@stevenhydrotech.example'],
                [
                    'password_hash' => Hash::make('ChangeMe!12345'),
                    'first_name' => 'Grace',
                    'last_name' => 'Dizon',
                    'display_name' => 'Grace Dizon',
                    'avatar_url' => 'https://api.dicebear.com/7.x/initials/svg?seed=Grace+Dizon',
                    'is_active' => true,
                    'email_verified_at' => now(),
                ],
            );
            $staff->roles()->syncWithoutDetaching([
                $staffRole->id => ['effective_from' => now(), 'created_at' => now()],
            ]);
            if ($mainBranch) {
                $staff->branches()->syncWithoutDetaching([
                    $mainBranch->id => ['is_default' => true, 'created_at' => now()],
                ]);
            }
        }
    }
}
