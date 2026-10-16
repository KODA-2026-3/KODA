import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { EstadisticasService } from './estadisticas.service';
import { environment } from '../../../environments/environment';
import { Estadisticas } from '../models/estadisticas.model';

describe('EstadisticasService', () => {
  let service: EstadisticasService;
  let httpMock: HttpTestingController;
  const url = `${environment.apiBaseUrl}/estadisticas`;

  const mockEstadisticas: Estadisticas = {
    totalRadiografias: 200,
    radiografiasHoy: 15,
    confianzaPromedio: 0.91,
    medicosActivos: 8,
    distribucionKL: [
      { gradoKL: 0, cantidad: 50 },
      { gradoKL: 1, cantidad: 40 },
      { gradoKL: 2, cantidad: 60 },
      { gradoKL: 3, cantidad: 30 },
      { gradoKL: 4, cantidad: 20 }
    ],
    radiografiasPorDia: [
      { fecha: '2026-05-15', cantidad: 15 }
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        EstadisticasService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(EstadisticasService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe obtener estadísticas y almacenarlas en la señal reactiva', (done) => {
    service.obtener().subscribe((datos) => {
      expect(datos.totalRadiografias).toBe(200);
      expect(datos.radiografiasHoy).toBe(15);
      expect(datos.confianzaPromedio).toBe(0.91);
      expect(datos.medicosActivos).toBe(8);
      expect(service.estadisticas()?.totalRadiografias).toBe(200);
      done();
    });

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('GET');
    req.flush(mockEstadisticas);
  });

  it('debe mapear errores 403 a mensaje descriptivo de permisos', (done) => {
    service.obtener().subscribe({
      next: () => fail('Debió fallar con 403'),
      error: (error: Error) => {
        expect(error.message).toContain('No tiene permisos para ver esta información');
        done();
      }
    });

    const req = httpMock.expectOne(url);
    req.flush({ mensaje: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
  });
});
