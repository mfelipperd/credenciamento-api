# 🔧 Funcionalidade Atualizada - Redução de Stands

## 📅 Data da Atualização

**11 de agosto de 2025**

---

## 🎯 **Nova Funcionalidade Implementada**

### **✅ Agora é possível REDUZIR a quantidade de stands!**

A configuração de stands foi atualizada para permitir **aumentar OU diminuir** a quantidade total de stands de uma feira.

---

## 🔄 **Como Funciona a Redução**

### **Regras de Negócio:**

1. **✅ Stands Disponíveis**: Podem ser removidos sem restrições
2. **❌ Stands Vendidos**: NÃO podem ser removidos (protegidos)
3. **🔢 Ordem de Remoção**: Remove sempre os stands com números mais altos primeiro

### **Exemplo Prático:**

```
Situação inicial: 78 stands
- Stands 1-10: Vendidos (isAvailable = false)
- Stands 11-78: Disponíveis (isAvailable = true)

✅ Pode reduzir para: 64 stands
- Resultado: Remove stands 65-78 (disponíveis)
- Mantém: Stands 1-64 (incluindo os 10 vendidos)

❌ NÃO pode reduzir para: 5 stands
- Motivo: Já existem 10 stands vendidos
- Mínimo permitido: 10 stands
```

---

## 🧮 **Lógica Implementada**

### **Algoritmo de Redução:**

```typescript
// 1. Verificar stands ocupados (vendidos)
const occupiedStands = await this.standRepository.count({
  where: { fairId, isAvailable: false },
});

// 2. Validar se é possível reduzir
if (totalStands < occupiedStands) {
  throw new BadRequestException(
    `Não é possível reduzir para ${totalStands} stands. 
     Já existem ${occupiedStands} stands vendidos. 
     Mínimo permitido: ${occupiedStands} stands.`,
  );
}

// 3. Remover apenas stands disponíveis com números mais altos
await this.standRepository
  .createQueryBuilder()
  .delete()
  .from(Stand)
  .where('fairId = :fairId', { fairId })
  .andWhere('isAvailable = true')
  .andWhere('standNumber > :minStandNumber', {
    minStandNumber: totalStands,
  })
  .execute();
```

---

## 📋 **Cenários de Uso**

### **Cenário 1: Redução Permitida**

```json
// Request
{
  "fairId": "da6e3a8a-07dd-4964-a892-08a626bdd64f",
  "totalStands": 64
}

// Response (Sucesso)
{
  "message": "Feira configurada com 64 stands",
  "totalStands": 64
}
```

### **Cenário 2: Redução Bloqueada**

```json
// Request
{
  "fairId": "da6e3a8a-07dd-4964-a892-08a626bdd64f",
  "totalStands": 5
}

// Response (Erro)
{
  "statusCode": 400,
  "message": "Não é possível reduzir para 5 stands. Já existem 15 stands vendidos. Mínimo permitido: 15 stands.",
  "error": "Bad Request"
}
```

### **Cenário 3: Aumento (Como Antes)**

```json
// Request
{
  "fairId": "da6e3a8a-07dd-4964-a892-08a626bdd64f",
  "totalStands": 100
}

// Response (Sucesso)
{
  "message": "Feira configurada com 100 stands",
  "totalStands": 100
}
```

---

## 🛡️ **Validações de Segurança**

### **1. Proteção de Stands Vendidos**

- ✅ Stands com `isAvailable = false` **NUNCA** são removidos
- ✅ Stands com receitas vinculadas são protegidos

### **2. Validação de Quantidade Mínima**

- ✅ Sistema calcula automaticamente o mínimo possível
- ✅ Erro claro quando tentativa é inválida

### **3. Remoção Inteligente**

- ✅ Remove sempre os stands com **números mais altos**
- ✅ Preserva a sequência dos stands ocupados

---

## 📖 **Documentação Atualizada**

### **Endpoint:** `POST /finance/stands/configure`

**Descrição:** Configura o total de stands para uma feira. Pode aumentar ou diminuir a quantidade. Ao diminuir, remove apenas stands disponíveis (não vendidos). Stands vendidos não podem ser removidos.

**Payload:**

```typescript
{
  fairId: string; // UUID da feira
  totalStands: number; // Nova quantidade total (pode ser maior ou menor)
}
```

**Responses:**

- `201`: Stands configurados com sucesso
- `400`: Erro de validação, regra de negócio ou tentativa de remover stands vendidos

---

## 🧪 **Exemplo de Teste**

### **Setup inicial:**

```bash
# 1. Configurar 78 stands
curl -X POST http://localhost:8000/finance/stands/configure \
  -H "Content-Type: application/json" \
  -d '{"fairId": "da6e3a8a-07dd-4964-a892-08a626bdd64f", "totalStands": 78}'

# 2. Vender alguns stands (simular)
# (criar receitas para stands 1-10)

# 3. Reduzir para 64 stands
curl -X POST http://localhost:8000/finance/stands/configure \
  -H "Content-Type: application/json" \
  -d '{"fairId": "da6e3a8a-07dd-4964-a892-08a626bdd64f", "totalStands": 64}'
```

### **Resultado esperado:**

- ✅ Stands 1-10: Mantidos (vendidos)
- ✅ Stands 11-64: Mantidos (disponíveis)
- ✅ Stands 65-78: Removidos (eram disponíveis)

---

## ⚡ **Vantagens da Nova Implementação**

### **1. Flexibilidade Total**

- ✅ Aumentar stands a qualquer momento
- ✅ Reduzir stands quando necessário
- ✅ Protege investimentos dos clientes

### **2. Segurança de Dados**

- ✅ Stands vendidos nunca são perdidos
- ✅ Receitas permanecem íntegras
- ✅ Relacionamentos preservados

### **3. Usabilidade**

- ✅ Mensagens de erro claras
- ✅ Cálculo automático de limites
- ✅ Operação simples e intuitiva

---

## 📱 **Impacto para o Frontend**

### **Interface Sugerida:**

```jsx
const ConfigureStands = ({ fairId }) => {
  const [totalStands, setTotalStands] = useState(0);
  const [currentStands, setCurrentStands] = useState(0);
  const [occupiedStands, setOccupiedStands] = useState(0);

  const handleSubmit = async () => {
    try {
      await fetch('/finance/stands/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fairId, totalStands }),
      });

      toast.success('Stands configurados com sucesso!');
    } catch (error) {
      if (error.message.includes('stands vendidos')) {
        toast.error(
          `Não é possível reduzir. Mínimo: ${occupiedStands} stands vendidos.`,
        );
      }
    }
  };

  return (
    <div>
      <label>Total de Stands:</label>
      <input
        type="number"
        value={totalStands}
        min={occupiedStands} // Limitar pelo mínimo permitido
        onChange={(e) => setTotalStands(e.target.value)}
      />
      <p>
        Atual: {currentStands} | Vendidos: {occupiedStands}
      </p>
      <button onClick={handleSubmit}>Configurar</button>
    </div>
  );
};
```

---

## ✅ **Status da Implementação**

- [x] Lógica de redução implementada
- [x] Validações de segurança aplicadas
- [x] Proteção de stands vendidos
- [x] Mensagens de erro claras
- [x] Documentação atualizada
- [x] Compilação confirmada

---

## 🚀 **Conclusão**

**🎉 Funcionalidade implementada com sucesso!**

Agora é possível **aumentar ou reduzir** a quantidade de stands de uma feira de forma segura e inteligente, sempre protegendo os stands que já foram vendidos.

**A configuração de stands está mais flexível e robusta! 🎯**
