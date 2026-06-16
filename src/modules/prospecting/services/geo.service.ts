import { Injectable, Logger } from '@nestjs/common';

export interface CepGeoData {
  lat: number;
  lng: number;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
}

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);
  private readonly cache = new Map<string, CepGeoData | null>();

  async geocodeCep(cep: string): Promise<CepGeoData | null> {
    const clean = cep?.replace(/\D/g, '');
    if (!clean || clean.length !== 8) return null;
    if (this.cache.has(clean)) return this.cache.get(clean)!;

    try {
      const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${clean}`, {
        headers: { 'User-Agent': 'credenciamento-api/1.0' },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        this.cache.set(clean, null);
        return null;
      }

      const data = await res.json();
      const coords = data.location?.coordinates;

      if (!coords?.longitude || !coords?.latitude) {
        this.cache.set(clean, null);
        return null;
      }

      const result: CepGeoData = {
        lat: parseFloat(coords.latitude),
        lng: parseFloat(coords.longitude),
        neighborhood: data.neighborhood ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
      };

      this.cache.set(clean, result);
      return result;
    } catch (err) {
      this.logger.warn(`CEP geocoding failed for ${clean}: ${err.message}`);
      this.cache.set(clean, null);
      return null;
    }
  }
}
