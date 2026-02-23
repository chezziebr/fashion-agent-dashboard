import { useState, useEffect } from 'react';
import { Product, ApiResponse } from '@/types';

export function useProducts(filters?: {
  brand?: string;
  category?: string;
  garment_type?: string;
  search?: string;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.brand) params.append('brand', filters.brand);
      if (filters?.category) params.append('category', filters.category);
      if (filters?.garment_type) params.append('garment_type', filters.garment_type);
      if (filters?.search) params.append('search', filters.search);

      const url = `/api/products${params.toString() ? `?${params}` : ''}`;
      const response = await fetch(url);
      const result: ApiResponse<Product[]> = await response.json();

      if (result.success && result.data) {
        setProducts(result.data);
      } else {
        setError(result.error || 'Failed to fetch products');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [JSON.stringify(filters)]);

  return { products, loading, error, refetch: fetchProducts };
}

export function useProduct(id: string | null) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setProduct(null);
      return;
    }

    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/products/${id}`);
        const result: ApiResponse<Product> = await response.json();

        if (result.success && result.data) {
          setProduct(result.data);
        } else {
          setError(result.error || 'Failed to fetch product');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch product');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  return { product, loading, error };
}
