import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { MedicosService } from './medicos.service';
import { environment } from '../../../environments/environment';
import { Medico, NuevoMedico, EdicionMedico } from '../models/medico.model';

describe('MedicosService', () => {
  let service: MedicosService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiBaseUrl}/medicos`;

  const mockMedico: Medico = {
    id: 'u-1',
    nombre: 'Dr. Pedro Gomez',
    correo: 'pgomez@hospital.org',
    usuario: 'pgomez',
    institucion: 'Hospital Central',
    telefono: '3001234567',
    activo: true,
    ultimoAcceso: null
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MedicosService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(MedicosService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe listar los médicos y actualizar la señal interna', (done) => {
    service.listar().subscribe((medicos) => {
      expect(medicos.length).toBe(1);
      expect(service.medicos().length).toBe(1);
      expect(service.totalRegistrados()).toBe(1);
      done();
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush([mockMedico]);
  });

  it('debe obtener un médico por ID', (done) => {
    service.obtener('u-1').subscribe((medico) => {
      expect(medico.nombre).toBe('Dr. Pedro Gomez');
      done();
    });

    const req = httpMock.expectOne(`${baseUrl}/u-1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockMedico);
  });

  it('debe crear un médico y agregarlo a la señal interna', (done) => {
    const nuevo: NuevoMedico = {
      nombre: 'Dr. Pedro Gomez',
      correo: 'pgomez@hospital.org',
      usuario: 'pgomez',
      contrasenaTemporal: 'Temporal123!',
      institucion: 'Hospital Central',
      telefono: '3001234567'
    };

    service.crear(nuevo).subscribe((creado) => {
      expect(creado.id).toBe('u-1');
      expect(service.medicos().length).toBe(1);
      done();
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(nuevo);
    req.flush(mockMedico);
  });

  it('debe actualizar un médico existente', (done) => {
    const edicion: EdicionMedico = {
      nombre: 'Dr. Pedro Gomez Modificado',
      correo: 'pgomez@hospital.org',
      usuario: 'pgomez',
      institucion: 'Clinica Norte',
      telefono: '3001234567'
    };

    service.actualizar('u-1', edicion).subscribe((actualizado) => {
      expect(actualizado.nombre).toBe('Dr. Pedro Gomez Modificado');
      done();
    });

    const req = httpMock.expectOne(`${baseUrl}/u-1`);
    expect(req.request.method).toBe('PUT');
    req.flush({ ...mockMedico, nombre: 'Dr. Pedro Gomez Modificado' });
  });

  it('debe eliminar un médico', (done) => {
    service.eliminar('u-1').subscribe(() => {
      expect(service.medicos().find((m) => m.id === 'u-1')).toBeUndefined();
      done();
    });

    const req = httpMock.expectOne(`${baseUrl}/u-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
