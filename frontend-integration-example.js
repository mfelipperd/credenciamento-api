// Frontend Integration Example for Security System
// Arquivo: frontend-auth-helper.js

import crypto from 'crypto-js'; // ou use node crypto se for Node.js

class FrontendAuthHelper {
  constructor(secretKey) {
    this.secretKey =
      secretKey || process.env.FRONTEND_SECRET_KEY || 'your-secret-key-here';
  }

  /**
   * Gera o header x-frontend-auth necessário para acessar endpoints protegidos
   * @returns {string} Header criptografado com timestamp
   */
  generateFrontendAuth() {
    try {
      const timestamp = Date.now().toString();

      // Gerar IV aleatório
      const iv = crypto.lib.WordArray.random(16);

      // Criar chave derivada
      const key = crypto.PBKDF2(this.secretKey, 'salt', {
        keySize: 256 / 32,
        iterations: 1000,
      });

      // Criptografar timestamp
      const encrypted = crypto.AES.encrypt(timestamp, key, {
        iv: iv,
        mode: crypto.mode.CBC,
        padding: crypto.pad.Pkcs7,
      });

      // Retornar IV + encrypted data em hex
      return iv.toString() + encrypted.ciphertext.toString();
    } catch (error) {
      console.error('Erro ao gerar auth header:', error);
      throw new Error('Falha na geração do token de frontend');
    }
  }

  /**
   * Verifica se um endpoint requer proteção
   * @param {string} url - URL do endpoint
   * @returns {boolean} Se requer proteção
   */
  isProtectedEndpoint(url) {
    const protectedPaths = ['/visitors', '/visitors/stats'];

    return protectedPaths.some((path) => url.includes(path));
  }
}

// Exemplo de uso com Axios
export class ApiClient {
  constructor() {
    this.authHelper = new FrontendAuthHelper();
    this.setupInterceptors();
  }

  setupInterceptors() {
    // Interceptor para adicionar headers de segurança
    axios.interceptors.request.use(
      (config) => {
        // Verificar se endpoint é protegido
        if (this.authHelper.isProtectedEndpoint(config.url)) {
          try {
            // Adicionar header de frontend auth
            config.headers['x-frontend-auth'] =
              this.authHelper.generateFrontendAuth();

            console.log('🔒 Header de segurança adicionado para:', config.url);
          } catch (error) {
            console.error('❌ Falha ao adicionar header de segurança:', error);
            return Promise.reject(error);
          }
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      },
    );

    // Interceptor para tratar erros de segurança
    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          const message = error.response.data?.message || '';

          if (message.includes('Cliente de API detectado')) {
            console.error('🚫 Acesso bloqueado: Detector de cliente de API');
            this.showSecurityError(
              'Esta aplicação só pode ser acessada através de um navegador web.',
            );
          } else if (message.includes('Origem não permitida')) {
            console.error('🚫 Acesso bloqueado: Origem não autorizada');
            this.showSecurityError('Acesso negado: origem não autorizada.');
          } else if (message.includes('Token de frontend inválido')) {
            console.error('🚫 Acesso bloqueado: Token de frontend inválido');
            this.showSecurityError(
              'Token de segurança expirado. Recarregue a página.',
            );
          }
        }

        return Promise.reject(error);
      },
    );
  }

  showSecurityError(message) {
    // Implementar notificação para o usuário
    console.error('Erro de segurança:', message);

    // Exemplo com toast notification
    // toast.error(message);

    // Ou redirecionar para página de erro
    // window.location.href = '/security-error';
  }

  // Métodos da API que usarão automaticamente a proteção
  async getVisitors(fairId, params = {}) {
    try {
      const response = await axios.get('/visitors', {
        params: { fairId, ...params },
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar visitantes:', error);
      throw error;
    }
  }

  async getVisitorStats(fairId) {
    try {
      const response = await axios.get('/visitors/stats', {
        params: { fairId },
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      throw error;
    }
  }

  async getVisitorByCode(registrationCode, fairId) {
    try {
      const response = await axios.get(`/visitors/${registrationCode}`, {
        params: { fairId },
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar visitante:', error);
      throw error;
    }
  }
}

// Exemplo de uso em componente React
export const useVisitors = (fairId) => {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const apiClient = new ApiClient();

  const fetchVisitors = useCallback(
    async (params = {}) => {
      setLoading(true);
      setError(null);

      try {
        const data = await apiClient.getVisitors(fairId, params);
        setVisitors(data);
      } catch (err) {
        setError(err.message);
        console.error('Erro ao carregar visitantes:', err);
      } finally {
        setLoading(false);
      }
    },
    [fairId],
  );

  useEffect(() => {
    if (fairId) {
      fetchVisitors();
    }
  }, [fairId, fetchVisitors]);

  return {
    visitors,
    loading,
    error,
    refetch: fetchVisitors,
  };
};

// Exemplo de configuração de ambiente
// .env.local
/*
FRONTEND_SECRET_KEY=sua-chave-secreta-super-segura-aqui-2024
REACT_APP_API_BASE_URL=http://localhost:3001
*/

export default FrontendAuthHelper;
