// Tipos para la API de Metasync

// Tipos para la API de Inventario
// Formato original/antiguo
export interface MetasyncVehicle {
  IdLocal: number;
  Marca: string;
  Modelo: string;
  Version: string;
  Bastidor: string;
  Matricula: string;
  Color: string;
  Kilometraje: number;
  Combustible: string;
  Potencia: number;
  FechaMatriculacion: string;
  FechaBaja: string;
  AnyoVehiculo: number;
  UrlsImgs: string[];
  FechaMod: string;
  EstadoVehiculo: number;
}

// Formato nuevo que devuelve el endpoint RecuperarCambiosCanalEmpresa
export interface MetasyncVehicleNew {
  idLocal: number;
  idEmpresa: number;
  fechaMod: string;
  codigo: string;
  estado: string[];
  bastidor: string;
  matricula: string;
  color: string;
  kilometraje: number;
  anyoVehiculo: number;
  codigoMotor: string;
  codigoCambio: string;
  observaciones: string;
  urlsImgs: string[];
  codMarca: string;
  nombreMarca: string;
  codModelo: string;
  nombreModelo: string;
  codVersion: string;
  nombreVersion: string;
  tipoVersion: string | null;
  combustible: string | null;
  puertas: number | null;
  anyoInicio: number | null;
  anyoFin: number | null;
  tiposMotor: string | null;
  potenciaHP: number | null;
  potenciaKw: number | null;
  cilindrada: number | null;
  transmision: string | null;
  alimentacion: string | null;
  numMarchas: number | null;
  rvCode: string | null;
  ktype: string | null;
}

export interface MetasyncPart {
  idEmpresa: number;
  refLocal: number;
  idVehiculo: number;
  codFamilia: string;
  descripcionFamilia: string;
  codArticulo: string;
  descripcionArticulo: string;
  codVersion: string;
  refPrincipal: string;
  precio: number;
  anyoStock: number;
  peso: number;
  ubicacion: number;
  observaciones: string;
  reserva: number;
  tipoMaterial: number;
  urlsImgs: string[];
  fechaMod: string;
  situacion: string; // Estado de la pieza: "almacenada", "vendida", etc.
  // Campos opcionales para la coincidencia con vehículos
  codMarca?: string;
  codModelo?: string;
  tipoVersion?: string;
}

// Formato antiguo para mantener compatibilidad
export interface MetasyncPaginationResponse<T> {
  elements: T[];
  pagination: {
    lastId: number;
    hasMore: boolean;
    total?: number;
  };
  // Para retrocompatibilidad con el formato nuevo
  vehiculos?: T[];
  piezas?: T[];
  result_set?: {
    total: number;
    count: number;
    offset: number;
    lastId: number;
  };
}

// Formato de respuesta de vehículos según la documentación de la API
export interface MetasyncVehicleResponse {
  vehiculos: MetasyncVehicle[];
  result_set: {
    total: number;
    count: number;
    offset: number;
    lastId: number;
  };
  // Para retrocompatibilidad con el formato antiguo
  elements?: MetasyncVehicle[];
  pagination?: {
    lastId: number;
    hasMore: boolean;
    total?: number;
  };
}

// Formato de respuesta de piezas según la documentación de la API
export interface MetasyncPartResponse {
  piezas: MetasyncPart[];
  vehiculos?: MetasyncVehicleNew[]; // Añadido campo vehiculos que viene en algunas respuestas
  result_set: {
    total: number;
    count: number;
    offset: number;
    lastId: number;
  };
  // Para retrocompatibilidad con el formato antiguo
  elements?: MetasyncPart[];
  pagination?: {
    lastId: number;
    hasMore: boolean;
    total?: number;
  };
}

// Tipos para la API de Inserción
export interface MetasyncPiezaInsercion {
  IdEmpresa: number;
  IdPieza: number;
  IdVehiculo: number;
  DescripcionArticulo: string;
  codArticulo: string;
  codVersion: string;
  RefOEM: string;
  RefIAM: string;
  Precio: number;
  AnyoStock: number;
  Cantidad: number;
  Peso: number;
  Observaciones: string;
  EstadoPieza: number;
  UrlsImgs: string[];
  FechaIn: Date;
  FechaMod: Date;
}

export interface MetasyncVehiculoInsercion {
  IdVehiculo: number;
  codVersion: string;
  DescripcionVehiculo: string;
  Bastidor: string;
  Matricula: string;
  Color: string;
  Kilometraje: number;
  CodigoMotor: string;
  CodigoCambio: string;
  Observaciones: string;
  UrlsImgs: string[];
  AnyoVehiculo: number;
  FechaIn: Date;
  FechaMod: Date;
}

export interface MetasyncStockRequest {
  Piezas: MetasyncPiezaInsercion[];
  Vehiculos: MetasyncVehiculoInsercion[];
}

// Tipos para la API de Pedidos
export enum EstadoPedido {
  Desconocido = 0,
  EnSeguimiento = 1,
  Reservado = 2,
  Procesando = 3,
  EnReparto = 4,
  Entregado = 5,
  Anulado = 6,
  Devolucion = 7,
  DevolucionParcial = 8
}

export enum EstadoPago {
  Pendiente = 0,
  EsperaConfirmacion = 1,
  Pagado = 2,
  Fallido = 3,
  PendienteDevolucion = 4,
  Devuelto = 5
}

export enum FormaPago {
  Desconocido = 0,
  Cuenta = 1,
  Tarjeta = 2,
  Transferencia = 3,
  Paypal = 4,
  Bizum = 5, 
  Otros = 6
}

export enum TipoDireccion {
  Facturacion = 0,
  Envio = 1,
  OrigenEnvio = 2
}

export enum TipoLinea {
  Articulo = 1,
  Envio = 2,
  Descuento = 3,
  Otro = 4
}

export interface MetasyncDireccion {
  id: number;
  idVendedor: number;
  descripcion: string;
  tipo: TipoDireccion;
  nifCif: string;
  nombreComercial: string;
  razonSocial: string;
  domicilio: string;
  codigoProvincia: string;
  provincia: string;
  codigoPoblacion: string;
  poblacion: string;
  codigoPostal: string;
  codigoPais: string;
  pais: string;
  email: string;
  telefono1: string;
  telefono2?: string;
}

export interface MetasyncLineaPedido {
  id: number;
  idVendedor: number;
  idPedido: number;
  referencia: string;
  concepto: string;
  cantidad: number;
  precio: number;
  base: number;
  porcentajeDescuento: number;
  descuento: number;
  subtotal: number;
  tipo: TipoLinea;
  pedido?: any;
}

export interface MetasyncPedido {
  id: number;
  idVendedor: number;
  proveedor: string;
  canal: string;
  codigo: string;
  idCliente: string;
  codigoPago?: string;
  codigoCrvnet?: string;
  seguimientoUrl?: string;
  estado: EstadoPedido;
  estadoPago: EstadoPago;
  formaPago: FormaPago;
  base: number;
  porcentajeDescuento: number;
  descuento: number;
  subtotal: number;
  porcentajeIva: number;
  iva: number;
  total: number;
  fechaMod: string;
  fechaIn: string;
  observaciones?: string;
  idFacturacion: number;
  idEnvio?: number;
  idOrigenEnvio: number;
  recogidaTienda: boolean;
  estadoAccion: number;
  informacion?: string;
  incidenciasTotal: number;
  incidenciasAbiertas: number;
  contabilizado: boolean;
  estadoCRVNet: string;
  facturacion: MetasyncDireccion;
  envio?: MetasyncDireccion;
  origenEnvio: MetasyncDireccion;
  lineas: MetasyncLineaPedido[];
  documentos: any[];
  incidencias: any[];
}

// Interfaz para la configuración de la API
export interface ApiConfiguration {
  apiKey: string;
  companyId: number;
  channel: string;
}

// Interfaces para el historial de importaciones
export interface ImportSummary {
  type: string;
  status: string;
  totalItems: number;
  newItems: number;
  updatedItems: number;
  startTime: Date;
  endTime?: Date;
}
