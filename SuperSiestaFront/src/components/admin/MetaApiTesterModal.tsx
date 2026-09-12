import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Trash2,
  Copy,
  RefreshCw,
  Server,
  Monitor,
  ShieldCheck,
  Code2,
  Terminal,
  Bell,
} from "lucide-react";
import {
  META_PIXEL_ID,
  generateEventId,
  trackPageView,
  trackViewContent,
  trackAddToCart,
  trackInitiateCheckout,
  trackPurchase,
  trackLead,
  trackSearch,
  initAdvancedMatching,
} from "@/services/metaPixel";
import { api } from "@/lib/apiClient";

interface LogEntry {
  id: string;
  timestamp: string;
  type: "pixel" | "capi" | "push";
  eventName: string;
  status: "success" | "error" | "warning" | "info";
  eventId: string;
  message: string;
  payload?: any;
  response?: any;
}

interface MetaConfigBackend {
  pixel_id: string;
  has_access_token: boolean;
  masked_access_token: string | null;
  test_event_code: string | null;
  app_env: string;
  app_url: string;
}

interface MetaApiTesterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MetaApiTesterModal({ open, onOpenChange }: MetaApiTesterModalProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [backendConfig, setBackendConfig] = useState<MetaConfigBackend | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [testEventName, setTestEventName] = useState("PageView");
  const [userEmail, setUserEmail] = useState("client_test@supersiesta.tn");
  const [userPhone, setUserPhone] = useState("21620123456");
  const [userName, setUserName] = useState("Ahmed Kacem");
  const [userCity, setUserCity] = useState("Tunis");
  const [customValue, setCustomValue] = useState("250.00");
  const [activeTab, setActiveTab] = useState("pixel");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPushTesting, setIsPushTesting] = useState(false);

  const isPixelLoaded = typeof window !== "undefined" && typeof window.fbq === "function";

  const fetchConfig = async () => {
    setLoadingConfig(true);
    try {
      const res = await api.get<any>("/meta-test/config");
      setBackendConfig(res);
      addLog({
        type: "capi",
        eventName: "GET_CONFIG",
        status: "info",
        eventId: "config-" + Date.now(),
        message: "Configuration backend chargée",
        response: res,
      });
    } catch (err: any) {
      toast.error("Erreur chargement config backend Meta");
      addLog({
        type: "capi",
        eventName: "GET_CONFIG",
        status: "error",
        eventId: "config-err-" + Date.now(),
        message: err.message || "Erreur de connexion au backend",
        response: err,
      });
    } finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchConfig();
    }
  }, [open]);

  const addLog = (log: Omit<LogEntry, "id" | "timestamp">) => {
    const newEntry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString("fr-FR", { hour12: false }) + "." + String(Date.now()).slice(-3),
      ...log,
    };
    setLogs((prev) => [newEntry, ...prev.slice(0, 49)]); // keep last 50
  };

  // 1. Pixel Client Tests
  const handleTestPixelEvent = async (eventName: string) => {
    const eventId = generateEventId();
    try {
      if (!isPixelLoaded) {
        throw new Error("window.fbq n'est pas chargé dans le navigateur. Vérifiez votre script Pixel ou adblocker.");
      }

      // Execute Advanced Matching first
      await initAdvancedMatching({
        email: userEmail,
        phone: userPhone,
        firstName: userName.split(" ")[0] || userName,
        lastName: userName.split(" ").slice(1).join(" ") || "",
      });

      let resEid = eventId;
      const dummyProduct = { id: "p123", name: "Matelas Orthopédique Royal", price: parseFloat(customValue) || 100, category: "Matelas" };

      switch (eventName) {
        case "PageView":
          resEid = trackPageView(eventId);
          break;
        case "ViewContent":
          resEid = trackViewContent(dummyProduct, eventId);
          break;
        case "AddToCart":
          resEid = trackAddToCart({ ...dummyProduct, quantity: 1 }, eventId);
          break;
        case "InitiateCheckout":
          resEid = trackInitiateCheckout([{ ...dummyProduct, quantity: 1 }], dummyProduct.price, eventId);
          break;
        case "Purchase":
          resEid = trackPurchase({ orderId: "ORD-" + Math.floor(Math.random() * 10000), value: dummyProduct.price, items: [{ ...dummyProduct, quantity: 1 }] }, eventId);
          break;
        case "Lead":
          resEid = trackLead("Formulaire Test Admin", eventId);
          break;
        case "Search":
          resEid = trackSearch("Matelas ressorts", eventId);
          break;
        default:
          window.fbq("trackCustom", eventName, { value: parseFloat(customValue) || 0, currency: "TND" }, { eventID: eventId });
          break;
      }

      addLog({
        type: "pixel",
        eventName,
        status: "success",
        eventId: resEid,
        message: `Événement Pixel client [${eventName}] envoyé à window.fbq`,
        payload: {
          pixelId: META_PIXEL_ID,
          eventId: resEid,
          user: { email: userEmail, phone: userPhone, name: userName },
          custom: { value: customValue, currency: "TND" },
        },
      });

      toast.success(`Pixel Client [${eventName}] exécuté avec succès!`);
    } catch (err: any) {
      addLog({
        type: "pixel",
        eventName,
        status: "error",
        eventId,
        message: err.message || "Erreur lors de l'exécution de window.fbq",
        response: err,
      });
      toast.error(`Erreur Pixel [${eventName}]: ${err.message}`);
    }
  };

  // 2. Conversions API Server Tests
  const handleTestCapiEvent = async (eName?: string) => {
    setIsSubmitting(true);
    const targetEvent = eName || testEventName;
    const eventId = generateEventId();

    const userData = {
      email: userEmail,
      phone: userPhone,
      full_name: userName,
      city: userCity,
      country: "tn",
    };

    const customData = {
      value: parseFloat(customValue) || 150.0,
      currency: "TND",
      content_name: "Test CAPI Product Super Siesta",
    };

    try {
      const res = await api.post<any>("/meta-test/send-capi", {
        event_name: targetEvent,
        user_data: userData,
        custom_data: customData,
        event_id: eventId,
        event_source_url: window.location.href,
      });

      const isSuccess = res.success && res.result?.status === "success";
      const isSkipped = res.result?.status === "skipped";

      addLog({
        type: "capi",
        eventName: targetEvent,
        status: isSuccess ? "success" : isSkipped ? "warning" : "error",
        eventId: res.event_id || eventId,
        message: isSuccess
          ? `CAPI Graph API v18.0 [${targetEvent}] envoyé avec succès à Meta!`
          : isSkipped
          ? `CAPI ignoré: ${res.result?.reason || "Token manquant"}`
          : `Erreur CAPI Meta: ${res.result?.message || JSON.stringify(res.result)}`,
        payload: {
          userDataHashed: res.sent_user_data_sample,
          customData: res.sent_custom_data,
        },
        response: res,
      });

      if (isSuccess) {
        toast.success(`CAPI Server [${targetEvent}] validé par Meta Graph API!`);
      } else if (isSkipped) {
        toast.warning(`Token CAPI non configuré dans .env (META_ACCESS_TOKEN)`);
      } else {
        toast.error(`Erreur Meta Graph API [${res.result?.code || 'ERROR'}]`);
      }
    } catch (err: any) {
      addLog({
        type: "capi",
        eventName: targetEvent,
        status: "error",
        eventId,
        message: err.message || "Erreur de communication avec l'API CAPI Backend",
        response: err,
      });
      toast.error(`Échec appel CAPI: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    toast.info("Logs réinitialisés.");
  };

  const handleTestPushNotification = async () => {
    setIsPushTesting(true);
    const eventId = `push-test-${Date.now()}`;

    try {
      const response = await api.post<any>("/admin/notifications/test-push", {});
      addLog({
        type: "push",
        eventName: "TEST_PUSH_NOTIFICATION",
        status: "success",
        eventId,
        message: "Notification ajoutée à la queue backend. Vérifiez le worker Laravel et le téléphone.",
        response,
      });
      toast.success("Notification push ajoutée à la queue.");
    } catch (err: any) {
      addLog({
        type: "push",
        eventName: "TEST_PUSH_NOTIFICATION",
        status: "error",
        eventId,
        message: err.message || "Impossible d'ajouter la notification push",
        response: err,
      });
      toast.error(`Échec notification push: ${err.message}`);
    } finally {
      setIsPushTesting(false);
    }
  };

  const copyLogs = () => {
    navigator.clipboard.writeText(JSON.stringify(logs, null, 2));
    toast.success("Logs copiés dans le presse-papier!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-950 text-slate-100 border-slate-800">
        {/* Header */}
        <DialogHeader className="p-5 bg-slate-900/90 border-b border-slate-800 flex flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400 animate-pulse" />
              <DialogTitle className="text-xl font-bold text-white">
                Console de Test Meta Pixel & Conversions API (CAPI)
              </DialogTitle>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs">
                PROVISOIRE
              </Badge>
            </div>
            <DialogDescription className="text-slate-400 text-xs mt-1">
              Interface temporaire pour valider les tokens, Pixel ID, événements et vérifier les logs d'erreurs en temps réel.
            </DialogDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchConfig} disabled={loadingConfig} className="text-slate-400 hover:text-white">
            <RefreshCw className={`w-4 h-4 mr-1 ${loadingConfig ? "animate-spin" : ""}`} />
            Actualiser Config
          </Button>
        </DialogHeader>

        {/* Status Indicators Bar */}
        <div className="bg-slate-900/50 p-4 border-b border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* Frontend Pixel Status */}
          <div className="bg-slate-950/80 p-3 rounded border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-blue-400" />
              <div>
                <div className="font-semibold text-slate-200">Pixel Client (fbq)</div>
                <div className="text-slate-400 font-mono">ID: {META_PIXEL_ID || "Non défini"}</div>
              </div>
            </div>
            {isPixelLoaded ? (
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Chargé
              </Badge>
            ) : (
              <Badge variant="destructive" className="bg-rose-500/20 text-rose-300 border-rose-500/40">
                <XCircle className="w-3 h-3 mr-1" /> Non détecté
              </Badge>
            )}
          </div>

          {/* Backend CAPI Status */}
          <div className="bg-slate-950/80 p-3 rounded border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-purple-400" />
              <div>
                <div className="font-semibold text-slate-200">CAPI Server (Backend)</div>
                <div className="text-slate-400 font-mono">
                  Token: {backendConfig?.has_access_token ? "Configuré ✅" : "Manquant ❌"}
                </div>
              </div>
            </div>
            {backendConfig?.has_access_token ? (
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                <ShieldCheck className="w-3 h-3 mr-1" /> Actif
              </Badge>
            ) : (
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40">
                <AlertTriangle className="w-3 h-3 mr-1" /> Inactif
              </Badge>
            )}
          </div>

          {/* Test Event Code */}
          <div className="bg-slate-950/80 p-3 rounded border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-amber-400" />
              <div>
                <div className="font-semibold text-slate-200">Test Event Code Meta</div>
                <div className="text-slate-400 font-mono truncate max-w-[140px]">
                  {backendConfig?.test_event_code || "Aucun (Production)"}
                </div>
              </div>
            </div>
            <Badge variant="outline" className="text-slate-400 border-slate-700">
              Dev
            </Badge>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <div className="px-5 pt-3 bg-slate-900/30 border-b border-slate-800 flex items-center justify-between">
              <TabsList className="bg-slate-950 border border-slate-800 text-slate-400">
                <TabsTrigger value="pixel" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                  <Monitor className="w-3.5 h-3.5 mr-1.5" /> Client Pixel (fbq)
                </TabsTrigger>
                <TabsTrigger value="capi" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                  <Server className="w-3.5 h-3.5 mr-1.5" /> Server CAPI (Graph API)
                </TabsTrigger>
                <TabsTrigger value="push" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                  <Bell className="w-3.5 h-3.5 mr-1.5" /> Notification Push
                </TabsTrigger>
                <TabsTrigger value="logs" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white">
                  <Terminal className="w-3.5 h-3.5 mr-1.5" /> Logs en Temps Réel ({logs.length})
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={copyLogs} className="bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 text-xs">
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copier Logs
                </Button>
                <Button variant="outline" size="sm" onClick={clearLogs} className="bg-slate-900 border-slate-700 text-rose-400 hover:bg-rose-950/50 text-xs">
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Vider
                </Button>
              </div>
            </div>

            {/* Test Inputs Bar */}
            <div className="p-4 bg-slate-900/20 border-b border-slate-800 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
              <div>
                <Label className="text-slate-400 text-[11px]">Email Test</Label>
                <Input
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="h-8 bg-slate-950 border-slate-800 text-slate-200 text-xs"
                />
              </div>
              <div>
                <Label className="text-slate-400 text-[11px]">Téléphone Test</Label>
                <Input
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  className="h-8 bg-slate-950 border-slate-800 text-slate-200 text-xs"
                />
              </div>
              <div>
                <Label className="text-slate-400 text-[11px]">Nom Client</Label>
                <Input
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="h-8 bg-slate-950 border-slate-800 text-slate-200 text-xs"
                />
              </div>
              <div>
                <Label className="text-slate-400 text-[11px]">Ville</Label>
                <Input
                  value={userCity}
                  onChange={(e) => setUserCity(e.target.value)}
                  className="h-8 bg-slate-950 border-slate-800 text-slate-200 text-xs"
                />
              </div>
              <div>
                <Label className="text-slate-400 text-[11px]">Montant (TND)</Label>
                <Input
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  className="h-8 bg-slate-950 border-slate-800 text-slate-200 text-xs"
                />
              </div>
            </div>

            {/* TAB 1: Pixel Client Tests */}
            <TabsContent value="pixel" className="flex-1 p-5 overflow-y-auto m-0 space-y-4">
              <div className="text-xs text-slate-400 bg-indigo-950/30 border border-indigo-900/50 p-3 rounded">
                💡 <strong>Client Pixel:</strong> Ces boutons exécutent les fonctions <code>window.fbq('track', ...)</code> directement dans votre navigateur avec normalisation SHA-256 (Advanced Matching).
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Purchase", "Lead", "Search"].map((evt) => (
                  <Button
                    key={evt}
                    onClick={() => handleTestPixelEvent(evt)}
                    className="bg-slate-900 hover:bg-indigo-700 text-slate-200 border border-slate-800 justify-start text-xs h-10 font-mono"
                  >
                    <Play className="w-3.5 h-3.5 mr-2 text-indigo-400" />
                    {evt}
                  </Button>
                ))}
              </div>
            </TabsContent>

            {/* TAB 2: CAPI Server Tests */}
            <TabsContent value="capi" className="flex-1 p-5 overflow-y-auto m-0 space-y-4">
              <div className="text-xs text-slate-400 bg-purple-950/30 border border-purple-900/50 p-3 rounded">
                ⚡ <strong>Conversions API (CAPI):</strong> Envoie une requête HTTP POST directement du serveur Laravel vers <code>https://graph.facebook.com/v18.0/{'{pixel_id}'}/events</code>. Reçoit le retour exact de Meta Graph API (Code status, response body, erreurs de validation de token ou de format).
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Label className="text-slate-400 text-xs mb-1 block">Nom de l'événement CAPI</Label>
                  <Input
                    value={testEventName}
                    onChange={(e) => setTestEventName(e.target.value)}
                    placeholder="ex: Purchase, ViewContent..."
                    className="bg-slate-950 border-slate-800 text-slate-200 text-xs"
                  />
                </div>
                <Button
                  onClick={() => handleTestCapiEvent()}
                  disabled={isSubmitting}
                  className="mt-5 bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs h-9 px-5"
                >
                  {isSubmitting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                  Envoyer Événement CAPI
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {["Purchase", "InitiateCheckout", "AddToCart", "ViewContent", "Lead"].map((evt) => (
                  <Button
                    key={evt}
                    onClick={() => handleTestCapiEvent(evt)}
                    disabled={isSubmitting}
                    variant="outline"
                    className="bg-slate-900 hover:bg-purple-950/60 border-slate-800 text-slate-300 justify-start text-xs font-mono"
                  >
                    <Server className="w-3.5 h-3.5 mr-2 text-purple-400" />
                    Test CAPI: {evt}
                  </Button>
                ))}
              </div>
            </TabsContent>

            {/* TAB 3: Push notification test */}
            <TabsContent value="push" className="flex-1 p-5 overflow-y-auto m-0 space-y-4">
              <div className="text-xs text-slate-400 bg-emerald-950/30 border border-emerald-900/50 p-3 rounded">
                <strong>Test notification uniquement :</strong> ce bouton ne crée aucune commande. Il crée une notification admin et lance le même job push que celui utilisé après une nouvelle commande.
              </div>
              <Button
                onClick={handleTestPushNotification}
                disabled={isPushTesting}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs h-10 px-5"
              >
                {isPushTesting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Bell className="w-4 h-4 mr-2" />}
                Envoyer une notification test
              </Button>
              <p className="text-xs text-slate-500">
                Le worker backend doit être actif et le téléphone doit avoir accepté les notifications.
              </p>
            </TabsContent>

            {/* TAB 4: Live Logs Console */}
            <TabsContent value="logs" className="flex-1 p-0 overflow-hidden flex flex-col m-0 bg-slate-950">
              <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
                {logs.length === 0 ? (
                  <div className="text-slate-500 text-center py-12">
                    Aucun log pour le moment. Déclenchez un événement Pixel ou CAPI ci-dessus.
                  </div>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-3 rounded border ${
                        log.status === "success"
                          ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-300"
                          : log.status === "warning"
                          ? "bg-amber-950/20 border-amber-800/40 text-amber-300"
                          : log.status === "error"
                          ? "bg-rose-950/20 border-rose-800/40 text-rose-300"
                          : "bg-slate-900 border-slate-800 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">{log.timestamp}</span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase font-semibold ${
                              log.type === "pixel"
                                ? "bg-indigo-950 text-indigo-300 border-indigo-700"
                                : log.type === "capi"
                                ? "bg-purple-950 text-purple-300 border-purple-700"
                                : "bg-emerald-950 text-emerald-300 border-emerald-700"
                            }`}
                          >
                            {log.type}
                          </Badge>
                          <span className="font-bold text-white">{log.eventName}</span>
                          <span className="text-slate-400 text-[11px]">ID: {log.eventId}</span>
                        </div>
                        <Badge
                          className={`text-[10px] ${
                            log.status === "success"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : log.status === "warning"
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-rose-500/20 text-rose-300"
                          }`}
                        >
                          {log.status}
                        </Badge>
                      </div>

                      <div className="text-slate-200 mb-1">{log.message}</div>

                      {log.payload && (
                        <details className="mt-2 text-[11px] bg-slate-900/80 p-2 rounded border border-slate-800">
                          <summary className="cursor-pointer text-slate-400 hover:text-slate-200 font-sans">
                            Voir Payload Envoyé
                          </summary>
                          <pre className="mt-1 overflow-x-auto text-indigo-300">
                            {JSON.stringify(log.payload, null, 2)}
                          </pre>
                        </details>
                      )}

                      {log.response && (
                        <details className="mt-2 text-[11px] bg-slate-900/80 p-2 rounded border border-slate-800">
                          <summary className="cursor-pointer text-slate-400 hover:text-slate-200 font-sans">
                            Voir Réponse / Résultat Meta API
                          </summary>
                          <pre className="mt-1 overflow-x-auto text-emerald-300">
                            {JSON.stringify(log.response, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
