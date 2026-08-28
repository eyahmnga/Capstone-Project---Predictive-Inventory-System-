<?php

namespace App\Console\Commands;

use App\Domains\Identity\Models\Branch;
use App\Domains\Identity\Models\Role;
use App\Domains\Identity\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class UpdateSystemUsersCommand extends Command
{
    protected $signature = 'app:update-system-users';
    protected $description = 'Updates system users to the official 3 users (Steven, Danica, Elmer) and cleans up remaining users.';

    public function handle(): int
    {
        $this->info('Updating system users to the 3 official accounts...');

        $mainBranch = Branch::query()->where('code', 'MAIN')->first() ?? Branch::query()->first();
        $ownerRole = Role::query()->where('code', 'owner')->firstOrFail();
        $managerRole = Role::query()->where('code', 'manager')->firstOrFail();

        DB::transaction(function () use ($mainBranch, $ownerRole, $managerRole) {
            // 1. Owner: Steven Kristoffer Destura
            $owner = User::query()->where('id', 1)->first()
                ?? User::query()->where('email', 'owner@stevenhydrotech.example')->first()
                ?? new User();

            $owner->fill([
                'email' => 'owner@stevenhydrotech.example',
                'password_hash' => Hash::make('password123'),
                'first_name' => 'Steven Kristoffer',
                'last_name' => 'Destura',
                'display_name' => 'Steven Kristoffer Destura',
                'avatar_url' => 'https://api.dicebear.com/7.x/initials/svg?seed=Steven+Kristoffer+Destura',
                'is_active' => true,
                'email_verified_at' => now(),
            ]);
            $owner->save();

            $owner->roles()->sync([
                $ownerRole->id => ['effective_from' => now(), 'created_at' => now()],
            ]);

            if ($mainBranch) {
                $owner->branches()->sync([
                    $mainBranch->id => ['is_default' => true, 'created_at' => now()],
                ]);
            }

            // 2. Admin: Danica Olario Cardel
            $admin = User::query()->where('id', 2)->first()
                ?? User::query()->where('email', 'admin@stevenhydrotech.com')->first()
                ?? new User();

            $admin->fill([
                'email' => 'admin@stevenhydrotech.com',
                'password_hash' => Hash::make('password123'),
                'first_name' => 'Danica',
                'last_name' => 'Olario Cardel',
                'display_name' => 'Danica Olario Cardel',
                'avatar_url' => 'https://api.dicebear.com/7.x/initials/svg?seed=Danica+Olario+Cardel',
                'is_active' => true,
                'email_verified_at' => now(),
            ]);
            $admin->save();

            $admin->roles()->sync([
                $ownerRole->id => ['effective_from' => now(), 'created_at' => now()],
            ]);

            if ($mainBranch) {
                $admin->branches()->sync([
                    $mainBranch->id => ['is_default' => true, 'created_at' => now()],
                ]);
            }

            // 3. Manager: Elmer Ella
            $manager = User::query()->where('id', 3)->first()
                ?? User::query()->where('email', 'manager@stevenhydrotech.example')->first()
                ?? new User();

            $manager->fill([
                'email' => 'manager@stevenhydrotech.example',
                'password_hash' => Hash::make('password123'),
                'first_name' => 'Elmer',
                'last_name' => 'Ella',
                'display_name' => 'Elmer Ella',
                'avatar_url' => 'https://api.dicebear.com/7.x/initials/svg?seed=Elmer+Ella',
                'is_active' => true,
                'email_verified_at' => now(),
            ]);
            $manager->save();

            $manager->roles()->sync([
                $managerRole->id => ['effective_from' => now(), 'created_at' => now()],
            ]);

            if ($mainBranch) {
                $manager->branches()->sync([
                    $mainBranch->id => ['is_default' => true, 'created_at' => now()],
                ]);
            }

            $keptIds = [$owner->id, $admin->id, $manager->id];

            // Reassign all foreign keys safely
            $otherUsers = User::query()->whereNotIn('id', $keptIds)->get();
            foreach ($otherUsers as $otherUser) {
                $id = $otherUser->id;
                $ownerId = $owner->id;

                $this->reassignColumn('sales', 'cashier_user_id', $id, $ownerId);
                $this->reassignColumn('sales', 'approved_by_user_id', $id, $ownerId);

                $this->reassignColumn('purchase_orders', 'created_by_user_id', $id, $ownerId);
                $this->reassignColumn('purchase_orders', 'updated_by_user_id', $id, $ownerId);
                $this->reassignColumn('purchase_order_approvals', 'decision_by_user_id', $id, $ownerId);

                $this->reassignColumn('goods_receipts', 'created_by_user_id', $id, $ownerId);
                $this->reassignColumn('goods_receipts', 'updated_by_user_id', $id, $ownerId);

                $this->reassignColumn('inventory_adjustments', 'created_by_user_id', $id, $ownerId);
                $this->reassignColumn('inventory_adjustments', 'updated_by_user_id', $id, $ownerId);
                $this->reassignColumn('inventory_adjustments', 'approved_by_user_id', $id, $ownerId);

                $this->reassignColumn('inventory_movements', 'actor_user_id', $id, $ownerId);
                $this->reassignColumn('idempotency_keys', 'actor_user_id', $id, $ownerId);
                $this->reassignColumn('audit_logs', 'actor_user_id', $id, $ownerId);

                $this->reassignColumn('forecast_runs', 'created_by_user_id', $id, $ownerId);
                $this->reassignColumn('reorder_policies', 'created_by_user_id', $id, $ownerId);
                $this->reassignColumn('reorder_policies', 'updated_by_user_id', $id, $ownerId);
                $this->reassignColumn('eoq_calculations', 'created_by_user_id', $id, $ownerId);
                $this->reassignColumn('restocking_alerts', 'assigned_to_user_id', $id, $ownerId);

                $this->reassignColumn('branches', 'created_by_user_id', $id, $ownerId);
                $this->reassignColumn('branches', 'updated_by_user_id', $id, $ownerId);
                $this->reassignColumn('branches', 'deleted_by_user_id', $id, $ownerId);

                $this->reassignColumn('categories', 'created_by_user_id', $id, $ownerId);
                $this->reassignColumn('categories', 'updated_by_user_id', $id, $ownerId);
                $this->reassignColumn('categories', 'deleted_by_user_id', $id, $ownerId);

                $this->reassignColumn('products', 'created_by_user_id', $id, $ownerId);
                $this->reassignColumn('products', 'updated_by_user_id', $id, $ownerId);
                $this->reassignColumn('products', 'deleted_by_user_id', $id, $ownerId);

                $this->reassignColumn('suppliers', 'created_by_user_id', $id, $ownerId);
                $this->reassignColumn('suppliers', 'updated_by_user_id', $id, $ownerId);
                $this->reassignColumn('suppliers', 'deleted_by_user_id', $id, $ownerId);

                $this->reassignColumn('units_of_measure', 'created_by_user_id', $id, $ownerId);
                $this->reassignColumn('units_of_measure', 'updated_by_user_id', $id, $ownerId);
                $this->reassignColumn('units_of_measure', 'deleted_by_user_id', $id, $ownerId);

                // Detach relationships and delete
                $otherUser->roles()->detach();
                $otherUser->branches()->detach();
                if (Schema::hasTable('personal_access_tokens')) {
                    DB::table('personal_access_tokens')->where('tokenable_type', User::class)->where('tokenable_id', $id)->delete();
                }
                $otherUser->delete();
            }
        });

        $this->info('Successfully updated system users! Exactly 3 users remain:');
        $this->table(
            ['ID', 'Email', 'Display Name', 'Role'],
            User::with('roles')->get()->map(fn ($u) => [
                $u->id,
                $u->email,
                $u->display_name,
                $u->roles->pluck('name')->join(', '),
            ])
        );

        return self::SUCCESS;
    }

    private function reassignColumn(string $table, string $column, int $fromUserId, int $toUserId): void
    {
        if (Schema::hasTable($table) && Schema::hasColumn($table, $column)) {
            DB::table($table)->where($column, $fromUserId)->update([$column => $toUserId]);
        }
    }
}
