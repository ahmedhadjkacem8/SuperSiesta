import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Package } from "lucide-react";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DashboardCard } from "./DashboardCard";
import { getImageUrl } from "@/utils/imageUtils";

interface TopProductsTableProps {
  products: Array<{
    name: string;
    image: string | null;
    size: string;
    sales: number;
    revenue: number;
    cancellationRate: number | null;
  }>;
  loading: boolean;
}

function cancellationStyle(value: number | null): string {
  if (value === null) return "bg-slate-100 text-slate-500";
  if (value < 10) return "bg-emerald-50 text-emerald-700";
  if (value <= 15) return "bg-orange-50 text-orange-700";
  return "bg-rose-50 text-rose-700";
}

function ProductThumbnail({ image, name }: { image: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = image ? getImageUrl(image) : "";
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
      {imageUrl && !failed ? (
        <img
          src={imageUrl}
          alt={`Produit ${name}`}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Package className="h-4 w-4 text-slate-400" aria-hidden="true" />
      )}
    </div>
  );
}

export function TopProductsTable({ products, loading }: TopProductsTableProps) {
  const [showAll, setShowAll] = useState(false);
  const visibleProducts = showAll ? products : products.slice(0, 5);
  return (
    <DashboardCard
      title="Top produits"
      loading={loading}
      empty={!loading && products.length === 0}
      emptyMessage="Aucun produit vendu sur cette période"
      className="h-[500px] md:col-span-2 xl:col-span-1"
      contentClassName="flex min-h-0 flex-1 flex-col"
      action={products.length > 5 ? (
        <button
          type="button"
          onClick={() => setShowAll((current) => !current)}
          aria-expanded={showAll}
          className="inline-flex items-center gap-1 whitespace-nowrap px-1 text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          {showAll ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {showAll ? "Voir moins" : `Voir tous (${products.length})`}
        </button>
      ) : undefined}
    >
      <div className="-mx-2 min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-white">
            <TableRow className="border-slate-100 hover:bg-transparent">
              <TableHead className="w-8 text-xs">#</TableHead>
              <TableHead className="min-w-[150px] text-xs">Produit</TableHead>
              <TableHead className="text-right text-xs">Ventes</TableHead>
              <TableHead className="text-right text-xs">CA généré</TableHead>
              <TableHead
                className="text-right text-xs"
                title="Quantités annulées / quantités commandées pendant la période sélectionnée"
              >
                Taux annulation
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleProducts.map((product, index) => (
              <TableRow key={`${product.name}-${product.size}`} className="border-slate-100">
                <TableCell className="text-xs text-muted-foreground">{index + 1}</TableCell>
                <TableCell>
                  <div className="flex min-w-0 items-center gap-2.5">
                    <ProductThumbnail image={product.image} name={product.name} />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-slate-800">{product.name}</p>
                      {product.size && <p className="truncate text-[11px] text-muted-foreground">{product.size}</p>}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right text-xs font-medium">{product.sales}</TableCell>
                <TableCell className="whitespace-nowrap text-right text-xs font-medium">{product.revenue.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} DT</TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary" className={`whitespace-nowrap font-medium ${cancellationStyle(product.cancellationRate)}`}>
                    {product.cancellationRate === null ? "Donnée non disponible" : `${product.cancellationRate.toFixed(1)}%`}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DashboardCard>
  );
}
