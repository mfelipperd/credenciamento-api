# API de Email Marketing para Visitantes Ausentes

## Endpoint Criado

**URL:** `POST /emails/marketing/absent-visitors`

## Payload de Exemplo

```json
{
  "subject": "Não perca a oportunidade! Feira ainda acontece hoje",
  "htmlContent": "<html><head><meta charset='utf-8'><title>Email Marketing</title></head><body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'><div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;'><h1 style='margin: 0; font-size: 28px;'>🎪 Não perca a feira!</h1><p style='margin: 10px 0 0 0; font-size: 18px;'>Ainda há tempo de participar</p></div><div style='background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);'><h2 style='color: #333; margin-top: 0;'>Olá! 👋</h2><p style='font-size: 16px; margin-bottom: 20px;'>Notamos que você se registrou para nossa feira, mas ainda não fez seu check-in. A feira ainda está acontecendo e você pode aproveitar:</p><ul style='background: white; padding: 20px; border-radius: 5px; border-left: 4px solid #667eea;'><li>🏢 <strong>Networking</strong> com empresários do setor</li><li>🎯 <strong>Oportunidades</strong> de negócios únicos</li><li>📚 <strong>Palestras</strong> e workshops exclusivos</li><li>🎁 <strong>Brindes</strong> e sorteios especiais</li></ul><div style='text-align: center; margin: 30px 0;'><a href='https://credenciamento-frontend.vercel.app/visitor/checkin' style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 18px; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);'>🚀 Fazer Check-in Agora</a></div><p style='font-size: 14px; color: #666; text-align: center; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px;'>Este é um email automático de marketing.<br>Equipe de Credenciamento</p></div></body></html>",
  "fairId": "123e4567-e89b-12d3-a456-426614174000"
}
```

## Resposta de Sucesso

```json
{
  "success": true,
  "message": "Email de marketing enviado com sucesso",
  "sentTo": ["felipperabelodurans@gmail.com"],
  "fairId": "123e4567-e89b-12d3-a456-426614174000"
}
```

## Para Testar

Use um cliente HTTP como Postman ou Insomnia:

1. **Método:** POST
2. **URL:** `http://localhost:3000/emails/marketing/absent-visitors`
3. **Headers:** `Content-Type: application/json`
4. **Body:** JSON com subject, htmlContent e fairId

## Status

✅ Branch: `feature/email-marketing-absent-visitors`
✅ Endpoint: Configurado e pronto para teste
✅ Email de teste: `felipperabelodurans@gmail.com`
✅ Validação: DTO com validações implementadas
