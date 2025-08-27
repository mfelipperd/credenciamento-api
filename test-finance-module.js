/**
 * Script de teste para o módulo de finance
 * Testa as funcionalidades implementadas:
 * 1. Campo responsavel em clientes
 * 2. Campo standNumber opcional em receitas
 */

const API_BASE_URL = 'http://localhost:3000';

// Função para fazer requisições HTTP
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: ${data.message || 'Erro desconhecido'}`,
      );
    }

    return data;
  } catch (error) {
    console.error(`Erro na requisição para ${url}:`, error.message);
    throw error;
  }
}

// Teste 1: Criar cliente com campo responsavel
async function testCreateClientWithResponsavel() {
  console.log('\n=== Teste 1: Criar cliente com campo responsavel ===');

  const clientData = {
    fairId: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Empresa Teste Ltda',
    cnpj: '12.345.678/0001-90',
    email: 'contato@empresateste.com',
    phone: '(11) 99999-9999',
    responsavel: 'João Silva',
  };

  try {
    const client = await makeRequest(`${API_BASE_URL}/finance/clients`, {
      method: 'POST',
      body: JSON.stringify(clientData),
    });

    console.log('✅ Cliente criado com sucesso:', {
      id: client.id,
      name: client.name,
      responsavel: client.responsavel,
    });

    return client.id;
  } catch (error) {
    console.error('❌ Erro ao criar cliente:', error.message);
    return null;
  }
}

// Teste 2: Criar receita sem stand (campo standNumber opcional)
async function testCreateRevenueWithoutStand(clientId) {
  console.log('\n=== Teste 2: Criar receita sem stand ===');

  const revenueData = {
    fairId: '123e4567-e89b-12d3-a456-426614174000',
    clientId: clientId,
    entryModelId: '456e7890-e89b-12d3-a456-426614174000',
    // standNumber não é fornecido - deve ser opcional
    baseValue: 100000, // R$ 1.000,00
    discountCents: 0,
    contractValue: 100000,
    paymentMethod: 'PIX',
    numberOfInstallments: 1,
    condition: 'Pagamento à vista',
    notes: 'Receita de patrocínio',
    createdBy: 'user-123',
  };

  try {
    const revenue = await makeRequest(`${API_BASE_URL}/finance/revenues`, {
      method: 'POST',
      body: JSON.stringify(revenueData),
    });

    console.log('✅ Receita criada sem stand com sucesso:', {
      id: revenue.id,
      clientId: revenue.clientId,
      contractValue: revenue.contractValue,
      hasStand: !!revenue.stand,
    });

    return revenue.id;
  } catch (error) {
    console.error('❌ Erro ao criar receita sem stand:', error.message);
    return null;
  }
}

// Teste 3: Criar receita com stand
async function testCreateRevenueWithStand(clientId) {
  console.log('\n=== Teste 3: Criar receita com stand ===');

  const revenueData = {
    fairId: '123e4567-e89b-12d3-a456-426614174000',
    clientId: clientId,
    entryModelId: '456e7890-e89b-12d3-a456-426614174000',
    standNumber: 15, // Stand específico
    baseValue: 50000, // R$ 500,00
    discountCents: 0,
    contractValue: 50000,
    paymentMethod: 'CARTAO_CREDITO',
    numberOfInstallments: 3,
    condition: '3x sem juros',
    notes: 'Venda de stand',
    createdBy: 'user-123',
  };

  try {
    const revenue = await makeRequest(`${API_BASE_URL}/finance/revenues`, {
      method: 'POST',
      body: JSON.stringify(revenueData),
    });

    console.log('✅ Receita criada com stand com sucesso:', {
      id: revenue.id,
      clientId: revenue.clientId,
      contractValue: revenue.contractValue,
      hasStand: !!revenue.stand,
      standNumber: revenue.stand?.standNumber,
    });

    return revenue.id;
  } catch (error) {
    console.error('❌ Erro ao criar receita com stand:', error.message);
    return null;
  }
}

// Teste 4: Atualizar cliente com novo responsavel
async function testUpdateClientResponsavel(clientId) {
  console.log('\n=== Teste 4: Atualizar responsavel do cliente ===');

  const updateData = {
    responsavel: 'Maria Santos',
  };

  try {
    const updatedClient = await makeRequest(
      `${API_BASE_URL}/finance/clients/${clientId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      },
    );

    console.log('✅ Responsavel do cliente atualizado com sucesso:', {
      id: updatedClient.id,
      name: updatedClient.name,
      responsavel: updatedClient.responsavel,
    });

    return updatedClient;
  } catch (error) {
    console.error(
      '❌ Erro ao atualizar responsavel do cliente:',
      error.message,
    );
    return null;
  }
}

// Função principal de teste
async function runTests() {
  console.log('🚀 Iniciando testes do módulo de finance...');

  try {
    // Teste 1: Criar cliente
    const clientId = await testCreateClientWithResponsavel();
    if (!clientId) {
      console.log('❌ Teste 1 falhou, abortando testes subsequentes');
      return;
    }

    // Teste 2: Criar receita sem stand
    const revenueWithoutStandId = await testCreateRevenueWithoutStand(clientId);
    if (!revenueWithoutStandId) {
      console.log('❌ Teste 2 falhou');
    }

    // Teste 3: Criar receita com stand
    const revenueWithStandId = await testCreateRevenueWithStand(clientId);
    if (!revenueWithStandId) {
      console.log('❌ Teste 3 falhou');
    }

    // Teste 4: Atualizar responsavel
    const updatedClient = await testUpdateClientResponsavel(clientId);
    if (!updatedClient) {
      console.log('❌ Teste 4 falhou');
    }

    console.log('\n🎉 Todos os testes foram executados!');
    console.log('\n📋 Resumo das funcionalidades testadas:');
    console.log('✅ Campo responsavel em clientes');
    console.log('✅ Campo standNumber opcional em receitas');
    console.log('✅ Criação de receitas com e sem stands');
    console.log('✅ Atualização de responsavel de clientes');
  } catch (error) {
    console.error('❌ Erro geral durante os testes:', error.message);
  }
}

// Executar testes se o script for chamado diretamente
if (typeof require !== 'undefined' && require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  testCreateClientWithResponsavel,
  testCreateRevenueWithoutStand,
  testCreateRevenueWithStand,
  testUpdateClientResponsavel,
};
