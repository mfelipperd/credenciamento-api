# **Business Fair API - Documentation**

## **📌 Overview**

The **Business Fair API** is responsible for managing visitor registration, check-ins, and dashboard analytics for a business event. It also includes **email marketing and remarketing** features to maximize visitor engagement.

This document provides details on the available endpoints, authentication, and how to interact with the API.

---

## **📌 Tech Stack**

- **Framework:** NestJS
- **Database:** MySQL (using TypeORM)
- **Authentication:** JWT
- **Email Provider:** Google SMTP
- **Containerization:** Docker

---

## **📌 Installation & Setup**

### **1️⃣ Clone the repository**

```sh
git clone https://github.com/your-repo/business-fair-api.git
cd business-fair-api
```

### **2️⃣ Install dependencies**

```sh
npm install
```

### **3️⃣ Set up environment variables**

Create a `.env` file in the project root with the following variables:

```env
# Database Config
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=business_fair

# JWT Secret
JWT_SECRET=your-secret-key

# SMTP Config
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-email-password
SMTP_SECURE=false
```

### **4️⃣ Run the application**

```sh
npm run start:dev
```

---

## **📌 API Endpoints**

### **🔹 Authentication**

✅ **Login**

```
POST /auth/login
```

**Request:**

```json
{
  "email": "admin@email.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "access_token": "your-jwt-token"
}
```

---

### **🔹 Visitors**

✅ **Register a Visitor**

```
POST /visitors
```

**Request:**

```json
{
  "name": "John Doe",
  "company": "Tech Corp",
  "email": "john@email.com",
  "cnpj": "00.000.000/0000-00",
  "phone": "11999999999",
  "zipCode": "01001000",
  "category": "visitor"
}
```

✅ **Get All Visitors**

```
GET /visitors
```

✅ **Get Visitor by Registration Code**

```
GET /visitors/:registrationCode
```

---

### **🔹 Check-ins**

✅ **Register a Check-in**

```
POST /checkins
```

**Request:**

```json
{
  "registrationCode": "abc123-def456"
}
```

✅ **Get Today's Check-ins**

```
GET /dashboard/checkins/today
```

---

### **🔹 Dashboard**

✅ **Event Overview**

```
GET /dashboard/overview
```

✅ **Absent Visitors**

```
GET /dashboard/absent-visitors
```

✅ **Top Frequent Visitors**

```
GET /dashboard/top-frequent-visitors
```

✅ **Total Visitors Count**

```
GET /dashboard/visitors/count
```

✅ **Visitors by Category**

```
GET /dashboard/visitors/category
```

✅ **Visitors by Origin (How They Heard About Us)**

```
GET /dashboard/visitors/origin
```

✅ **Visitors by Sector of Interest**

```
GET /dashboard/visitors/sectors
```

---

### **🔹 Email Remarketing**

✅ **Send Custom Remarketing Emails**

```
POST /emails/remarketing/custom
```

**Request:**

```json
{
  "registrationCodes": ["abc123-def456", "ghi789-jkl012"],
  "subject": "We Miss You!",
  "html": "<h1>Hello {{name}},</h1><p>Come back to our event for more networking!</p>"
}
```

---

## **📌 Notes**

- **Authentication is required** for all endpoints except `POST /visitors` (public registration).
- Ensure the **JWT token** is included in the `Authorization` header for protected routes.
- The application runs on **localhost:8000**.

🚀 **Now you’re ready to integrate the API with the frontend!** 🎉
