import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Search, FileDown, Mail, Loader2, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { confirmDelete } from "@/lib/swal";
import { useNewsletters } from "@/hooks/useNewsletters";
import * as XLSX from "xlsx-js-style";

export default function AdminNewsletter() {
  const { newsletters, isLoading, deleteEmail, refresh } = useNewsletters({ fetchList: true });
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const handleDelete = async (id: number) => {
    if (!(await confirmDelete("Supprimer cet email ?", "L'utilisateur ne recevra plus la newsletter."))) return;
    try {
      await deleteEmail(id);
    } catch (err: any) {
      // toast is already handled in mutation
    }
  };

  const handleExportExcel = () => {
    if (newsletters.length === 0) {
      toast.error("Aucun email à exporter");
      return;
    }

    // Prepare data
    const headerRow = ["ID", "Email", "Date", "Heure"];
    const dataRows = newsletters.map(e => [
      e.id,
      e.email,
      new Date(e.created_at).toLocaleDateString(),
      new Date(e.created_at).toLocaleTimeString()
    ]);

    // Create Workbook
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Subscribers List
    const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
    
    // Header Styling (indigo)
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + "1";
      if (!worksheet[address]) continue;
      worksheet[address].s = {
        fill: { fgColor: { rgb: "4F46E5" } },
        font: { color: { rgb: "FFFFFF" }, bold: true },
        alignment: { horizontal: "center" }
      };
    }
    worksheet['!cols'] = [{ wch: 10 }, { wch: 40 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, "Liste des Abonnés");

    // Sheet 2: Statistics (Repartition)
    const statsData: [string, any][] = [["Période", "Nombre d'inscriptions"]];
    const grouped = newsletters.reduce((acc: any, curr) => {
      const date = new Date(curr.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(grouped).forEach(([date, count]) => statsData.push([date, count]));
    
    const statsSheet = XLSX.utils.aoa_to_sheet(statsData);
    
    // Header Styling (green)
    const statsRange = XLSX.utils.decode_range(statsSheet['!ref'] || 'A1');
    for (let C = statsRange.s.c; C <= statsRange.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + "1";
      if (!statsSheet[address]) continue;
      statsSheet[address].s = {
        fill: { fgColor: { rgb: "16A34A" } },
        font: { color: { rgb: "FFFFFF" }, bold: true },
        alignment: { horizontal: "center" }
      };
    }
    statsSheet['!cols'] = [{ wch: 25 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(workbook, statsSheet, "Statistiques");

    // Export File
    XLSX.writeFile(workbook, `SuperSiesta_Newsletter_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Export Excel réussi avec statistiques");
  };

  const filtered = newsletters.filter((e) =>
    e.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedData = filtered.slice(startIndex, startIndex + rowsPerPage);

  const handleRowsPerPageChange = (val: string) => {
    setRowsPerPage(parseInt(val));
    setCurrentPage(1);
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="w-6 h-6 text-primary" />
            Inscriptions Newsletter
          </h1>
          <p className="text-muted-foreground text-sm">Gérez les abonnés à votre newsletter</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refresh()} variant="ghost" size="icon" title="Rafraîchir" disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={handleExportExcel} className="gap-2 shadow-lg shadow-green-600/10 bg-green-600 hover:bg-green-700 text-white">
            <FileDown className="w-4 h-4" /> Exporter en EXCEL
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher un email..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="pl-9 bg-background/50 border-border/50 focus:border-primary" 
          />
        </div>
        
        <div className="flex items-center gap-3 bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Lignes :</span>
          <select 
            value={rowsPerPage} 
            onChange={(e) => handleRowsPerPageChange(e.target.value)}
            className="bg-transparent text-xs font-bold outline-none cursor-pointer"
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border/60 overflow-hidden shadow-sm transition-all duration-300">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-16">ID</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Date d'inscription</TableHead>
              <TableHead className="w-20 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && newsletters.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-20">
                  <div className="relative w-12 h-12 mx-auto mb-4">
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    <Mail className="w-6 h-6 text-primary/40 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-muted-foreground animate-pulse font-medium">Récupération des abonnés...</p>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-20">
                  <div className="mb-4 opacity-20 flex justify-center">
                    <Mail className="w-16 h-16" />
                  </div>
                  <p className="italic">{search ? "Aucun email ne correspond à votre recherche" : "Aucun abonné pour le moment"}</p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((e) => (
                <TableRow key={e.id} className="hover:bg-primary/[0.02] transition-colors group border-b border-border/40 last:border-0">
                  <TableCell className="font-mono text-xs text-muted-foreground">#{e.id}</TableCell>
                  <TableCell className="font-semibold text-foreground/90">{e.email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <span className="text-foreground/70">{new Date(e.created_at).toLocaleDateString()}</span>
                    <span className="mx-2 opacity-30">|</span>
                    <span className="text-xs">{new Date(e.created_at).toLocaleTimeString()}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(e.id)}
                      className="opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/10 hover:text-destructive hover:scale-110 active:scale-95"
                      title="Supprimer l'abonné"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="mt-4 flex justify-between items-center px-2">
        <div className="text-xs text-muted-foreground font-medium flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary/40 animate-pulse" />
          Total abonnés: <span className="text-foreground font-bold">{filtered.length}</span>
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-xs font-medium">
              Page {currentPage} sur {totalPages}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
