export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080/api',
  inferenceUrl: 'http://localhost:8000',
  /**
   * true = el login valida contra las credenciales de demostracion en memoria,
   * sin necesidad de levantar el backend (util para mostrar las pantallas).
   * false = el login llama a POST /auth/login.
   */
  authMock: false
};
