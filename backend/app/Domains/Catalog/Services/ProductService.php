<?php

namespace App\Domains\Catalog\Services;

use App\Domains\Catalog\Models\Category;
use App\Domains\Catalog\Models\Product;
use App\Domains\Identity\Models\User;
use Illuminate\Support\Facades\DB;

class ProductService
{
    public function create(array $attributes, User $actor): Product
    {
        return DB::transaction(function () use ($attributes, $actor) {
            if (empty($attributes['sku'])) {
                $attributes['sku'] = $this->generateUniqueSku($attributes['category_id'] ?? null);
            } else {
                $this->assertSkuAvailable($attributes['sku']);
            }

            if (! empty($attributes['barcode'])) {
                $this->assertBarcodeAvailable($attributes['barcode']);
            }

            $product = Product::query()->create([
                ...$attributes,
                'row_version' => 1,
                'created_by_user_id' => $actor->id,
                'updated_by_user_id' => $actor->id,
            ]);

            return $product->refresh();
        });
    }

    public function update(Product $product, array $attributes, User $actor): Product
    {
        return DB::transaction(function () use ($product, $attributes, $actor) {
            $locked = Product::query()->lockForUpdate()->findOrFail($product->id);

            if (array_key_exists('sku', $attributes) && ! empty($attributes['sku']) && $attributes['sku'] !== $locked->sku) {
                $this->assertSkuAvailable($attributes['sku']);
            }

            if (array_key_exists('barcode', $attributes) && $attributes['barcode'] !== null && $attributes['barcode'] !== $locked->barcode) {
                $this->assertBarcodeAvailable($attributes['barcode']);
            }

            $locked->fill($attributes);
            $locked->updated_by_user_id = $actor->id;
            $locked->row_version = $locked->row_version + 1;
            $locked->save();

            return $locked;
        });
    }

    public function archive(Product $product, User $actor): void
    {
        DB::transaction(function () use ($product, $actor) {
            $locked = Product::query()->lockForUpdate()->findOrFail($product->id);
            $locked->deleted_by_user_id = $actor->id;
            $locked->is_active = false;
            $locked->row_version = $locked->row_version + 1;
            $locked->save();
            $locked->delete();
        });
    }

    public function unarchive(int $productId, User $actor): Product
    {
        return DB::transaction(function () use ($productId, $actor) {
            $locked = Product::query()->onlyTrashed()->lockForUpdate()->findOrFail($productId);
            $locked->deleted_by_user_id = null;
            $locked->is_active = true;
            $locked->row_version = $locked->row_version + 1;
            $locked->deleted_at = null;
            $locked->updated_by_user_id = $actor->id;
            $locked->save();

            return $locked;
        });
    }

    public function generateUniqueSku(?int $categoryId = null): string
    {
        $prefix = 'SHX';
        $catCode = 'PRD';

        if ($categoryId) {
            $category = Category::query()->find($categoryId);
            if ($category && $category->code) {
                $catCode = strtoupper(substr($category->code, 0, 4));
            } elseif ($category && $category->name) {
                $cleaned = preg_replace('/[^A-Za-z0-9]/', '', $category->name);
                $catCode = strtoupper(substr($cleaned ?: 'PRD', 0, 3));
            }
        }

        $existingCount = Product::withTrashed()->where('sku', 'LIKE', "{$prefix}-{$catCode}-%")->count();
        $counter = $existingCount + 1;
        $candidate = sprintf('%s-%s-%03d', $prefix, $catCode, $counter);

        while (Product::withTrashed()->where('sku', $candidate)->exists()) {
            $counter++;
            $candidate = sprintf('%s-%s-%03d', $prefix, $catCode, $counter);
        }

        return $candidate;
    }

    private function assertSkuAvailable(string $sku): void
    {
        if (Product::query()->withTrashed()->where('sku', $sku)->exists()) {
            throw new ProductException('DUPLICATE_SKU', 409, 'A product with this SKU already exists.');
        }
    }

    private function assertBarcodeAvailable(string $barcode): void
    {
        if (Product::query()->withTrashed()->where('barcode', $barcode)->exists()) {
            throw new ProductException('DUPLICATE_BARCODE', 409, 'A product with this barcode already exists.');
        }
    }
}
