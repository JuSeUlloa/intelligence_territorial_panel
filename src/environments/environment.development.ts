export const environment = {
  production: false,
  apiBaseUrl: '/api/dbx',
  endpoints: {
    departamentos: '/department',
    barrios: '/neighborhood',
    predicion: '/gold',
    predicion_mes: '/gold/{mes}',
    predicion_actual: '/prediction',
    predicion_municipio: '/prediction/neighborhood',
    predicion_municipio_mes: '/prediction/neighborhood/{mes}',
    predicion_municipio_actual: '/prediction/neighborhood/current',
    municipioDepartamento: '/department/{codigo_departamento}/municipality',
  },
  mapboxAccessToken:
    'pk.eyJ1IjoianN1bGxvYSIsImEiOiJjbXZscDEwZGkwNDdxMndvbXZxcTI4NjYwIn0.ufE4WYPucm0ADsbntZT6KQ',
};
