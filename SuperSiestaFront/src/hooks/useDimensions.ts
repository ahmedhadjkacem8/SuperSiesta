import { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";

export interface Dimension {
  id?: string;
  label: string;
  is_standard?: boolean;
  nb_places?: number | string | null;
}

let cachedDimensions: Dimension[] | null = null;
let dimensionsRequest: Promise<Dimension[]> | null = null;

const loadDimensions = (): Promise<Dimension[]> => {
  if (cachedDimensions) return Promise.resolve(cachedDimensions);
  if (!dimensionsRequest) {
    dimensionsRequest = api
      .get<Dimension[]>('/dimensions')
      .then((response: any) => {
        const dimensions = Array.isArray(response) ? response : response?.data || [];
        cachedDimensions = dimensions;
        return dimensions;
      })
      .catch(() => {
        dimensionsRequest = null;
        return [];
      });
  }
  return dimensionsRequest;
};

export function useDimensions(): Dimension[] {
  const [dimensions, setDimensions] = useState<Dimension[]>(cachedDimensions || []);

  useEffect(() => {
    let active = true;
    loadDimensions().then((loadedDimensions) => {
      if (active) setDimensions(loadedDimensions);
    });
    return () => {
      active = false;
    };
  }, []);

  return dimensions;
}
