# API de Email Marketing para Visitantes Ausentes

## ✅ ATUALIZAÇÃO: Agora Associado à Feira Específica!

**URL:** `POST /emails/marketing/absent-visitors`

### 🎯 Funcionalidades Implementadas:

- ✅ **Validação de Feira**: Verifica se a feira existe
- ✅ **Busca Visitantes Ausentes**: Consulta apenas visitantes da feira específica que não fizeram check-in
- ✅ **Query Database**: Utiliza a mesma lógica do dashboard para visitantes ausentes
- ✅ **Relatório Detalhado**: Retorna lista de visitantes ausentes encontrados
- ✅ **Email de Teste**: Por segurança, ainda envia apenas para `felipperabelodurans@gmail.com`

## 📊 Nova Resposta da API

```json
{
  "success": true,
  "message": "Email de marketing enviado com sucesso para 1 destinatário(s)",
  "sentTo": ["felipperabelodurans@gmail.com"],
  "fairId": "123e4567-e89b-12d3-a456-426614174000",
  "totalAbsent": 15,
  "absentVisitors": [
    {
      "name": "João Silva",
      "email": "joao@empresa.com",
      "company": "Empresa XYZ"
    },
    {
      "name": "Maria Santos",
      "email": "maria@startup.com",
      "company": "Startup ABC"
    }
    // ... outros visitantes ausentes
  ]
}
```

## 🔄 Processo Completo:

1. **Recebe** `fairId`, `subject` e `htmlContent`
2. **Valida** se a feira existe
3. **Consulta** visitantes da feira que não fizeram check-in
4. **Lista** todos os visitantes ausentes (para relatório)
5. **Envia** email apenas para o email de teste (por segurança)
6. **Retorna** estatísticas completas

## 🚀 Para Produção:

Para ativar o envio real, altere esta linha no service:

```typescript
// Atual (teste):
const emailsToSend = [testEmail];

// Produção:
const emailsToSend = absentVisitors.map((v) => v.email);
```

## ✅ Status Final:

- **✅ Feira Específica**: SIM - Busca apenas visitantes da feira informada
- **✅ Visitantes Ausentes**: SIM - Apenas quem não fez check-in
- **✅ Segurança**: SIM - Ainda envia apenas para email de teste
- **✅ Relatórios**: SIM - Mostra quantos e quais visitantes ausentes
