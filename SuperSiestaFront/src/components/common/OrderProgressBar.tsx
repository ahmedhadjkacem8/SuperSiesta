import React from 'react';
import { Clock, CheckCircle2, Truck, PackageCheck, XCircle, AlertCircle } from 'lucide-react';

interface OrderStep {
  status: string;
  label: string;
  icon: React.ReactNode;
  colorClass: string;
  bgColorClass: string;
}

const ORDER_STEPS: OrderStep[] = [
  {
    status: 'en_attente',
    label: 'En attente',
    icon: <Clock className="w-5 h-5" />,
    colorClass: 'text-amber-600',
    bgColorClass: 'bg-amber-50 border-amber-200',
  },
  {
    status: 'confirmée',
    label: 'Confirmée',
    icon: <CheckCircle2 className="w-5 h-5" />,
    colorClass: 'text-blue-600',
    bgColorClass: 'bg-blue-50 border-blue-200',
  },
  {
    status: 'expédiée',
    label: 'En livraison',
    icon: <Truck className="w-5 h-5" />,
    colorClass: 'text-indigo-600',
    bgColorClass: 'bg-indigo-50 border-indigo-200',
  },
  {
    status: 'livrée',
    label: 'Livrée',
    icon: <PackageCheck className="w-5 h-5" />,
    colorClass: 'text-green-600',
    bgColorClass: 'bg-green-50 border-green-200',
  },
];

interface Props {
  currentStatus: string;
  showLabel?: boolean;
  compact?: boolean;
}

export function OrderProgressBar({ currentStatus, showLabel = false, compact = false }: Props) {
  const currentIndex = ORDER_STEPS.findIndex((s) => s.status === currentStatus);
  const isCancelled = currentStatus === 'annulée';

  if (isCancelled) {
    return (
      <div className={`flex items-center gap-3 ${compact ? 'p-2' : 'p-4'} rounded-lg bg-red-50 border border-red-200`}>
        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-900">Commande annulée</p>
          {!compact && <p className="text-xs text-red-700">Cette commande a été annulée</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Progress bar visual */}
      <div className={compact ? 'mb-3' : ''}>
        <div className="flex items-center gap-2">
          {ORDER_STEPS.map((step, idx) => (
            <React.Fragment key={step.status}>
              {/* Circle with icon/check */}
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all flex-shrink-0 ${
                  idx <= currentIndex
                    ? `${step.colorClass} bg-white border-current`
                    : 'bg-gray-100 border-gray-300 text-gray-400'
                }`}
              >
                {idx < currentIndex ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  step.icon
                )}
              </div>

              {/* Connector line */}
              {idx < ORDER_STEPS.length - 1 && (
                <div
                  className={`h-1 flex-1 rounded-full transition-all ${
                    idx < currentIndex ? `${step.colorClass} bg-current` : 'bg-gray-300'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Labels and current status */}
      {!compact && (
        <div>
          <div className="text-xs text-muted-foreground mb-2">
            {ORDER_STEPS.map((step, idx) => (
              <span key={step.status} className="mr-4">
                <span
                  className={`font-medium ${idx <= currentIndex ? 'text-foreground font-semibold' : ''}`}
                >
                  {step.label}
                </span>
                {idx < ORDER_STEPS.length - 1 && <span className="text-gray-300 mx-2">→</span>}
              </span>
            ))}
          </div>

          {/* Current step details */}
          <div className={`flex items-start gap-3 p-3 rounded-lg border ${ORDER_STEPS[currentIndex]?.bgColorClass}`}>
            <div className={`flex-shrink-0 ${ORDER_STEPS[currentIndex]?.colorClass}`}>
              {ORDER_STEPS[currentIndex]?.icon}
            </div>
            <div>
              <p className="text-sm font-semibold">Étape actuelle: {ORDER_STEPS[currentIndex]?.label}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {currentIndex === 0 && 'Votre commande est en attente de confirmation.'}
                {currentIndex === 1 && 'Votre commande a été confirmée et est en préparation.'}
                {currentIndex === 2 && 'Votre commande est en cours de livraison.'}
                {currentIndex === 3 && 'Votre commande a été livrée avec succès!'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Compact version for tables / overview
export function OrderProgressBarCompact({ currentStatus }: { currentStatus: string }) {
  return <OrderProgressBar currentStatus={currentStatus} compact={true} />;
}
