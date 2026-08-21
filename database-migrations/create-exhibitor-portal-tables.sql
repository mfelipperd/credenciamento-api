CREATE TABLE IF NOT EXISTS exhibitors (
  id varchar(36) NOT NULL,
  name varchar(255) NOT NULL,
  normalizedName varchar(255) NOT NULL,
  type enum('BRAND','FACTORY','DISTRIBUTOR','OTHER') NOT NULL DEFAULT 'OTHER',
  cnpj varchar(14) NULL,
  isActive tinyint NOT NULL DEFAULT 1,
  createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY UQ_exhibitors_normalized_name (normalizedName)
);

CREATE TABLE IF NOT EXISTS exhibitor_finance_clients (
  id varchar(36) NOT NULL,
  exhibitorId varchar(36) NOT NULL,
  clientId varchar(36) NOT NULL,
  createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY UQ_exhibitor_finance_client (exhibitorId, clientId),
  UNIQUE KEY UQ_exhibitor_client_owner (clientId),
  CONSTRAINT FK_exhibitor_finance_client_exhibitor FOREIGN KEY (exhibitorId) REFERENCES exhibitors(id) ON DELETE CASCADE,
  CONSTRAINT FK_exhibitor_finance_client_client FOREIGN KEY (clientId) REFERENCES finance_clients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exhibitor_members (
  id varchar(36) NOT NULL,
  exhibitorId varchar(36) NOT NULL,
  userId int NULL,
  name varchar(255) NOT NULL,
  normalizedName varchar(255) NOT NULL,
  email varchar(255) NULL,
  phone varchar(30) NULL,
  jobTitle varchar(255) NULL,
  role enum('OWNER','ADMIN','FINANCE','MANAGER','STAFF') NOT NULL DEFAULT 'STAFF',
  isActive tinyint NOT NULL DEFAULT 1,
  createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY UQ_exhibitor_member_name (exhibitorId, normalizedName),
  KEY IDX_exhibitor_member_user (userId),
  CONSTRAINT FK_exhibitor_member_exhibitor FOREIGN KEY (exhibitorId) REFERENCES exhibitors(id) ON DELETE CASCADE,
  CONSTRAINT FK_exhibitor_member_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS exhibitor_fairs (
  id varchar(36) NOT NULL,
  exhibitorId varchar(36) NOT NULL,
  fairId varchar(36) NOT NULL,
  status enum('INVITED','CONFIRMED','CANCELLED') NOT NULL DEFAULT 'CONFIRMED',
  source varchar(100) NULL,
  createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY UQ_exhibitor_fair (exhibitorId, fairId),
  CONSTRAINT FK_exhibitor_fair_exhibitor FOREIGN KEY (exhibitorId) REFERENCES exhibitors(id) ON DELETE CASCADE,
  CONSTRAINT FK_exhibitor_fair_fair FOREIGN KEY (fairId) REFERENCES fairs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exhibitor_fair_members (
  id varchar(36) NOT NULL,
  exhibitorFairId varchar(36) NOT NULL,
  memberId varchar(36) NOT NULL,
  credentialCode varchar(36) NOT NULL,
  status enum('PENDING','ACTIVE','REVOKED') NOT NULL DEFAULT 'ACTIVE',
  createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY UQ_exhibitor_fair_member (exhibitorFairId, memberId),
  UNIQUE KEY UQ_exhibitor_credential (credentialCode),
  CONSTRAINT FK_exhibitor_fair_member_fair FOREIGN KEY (exhibitorFairId) REFERENCES exhibitor_fairs(id) ON DELETE CASCADE,
  CONSTRAINT FK_exhibitor_fair_member_member FOREIGN KEY (memberId) REFERENCES exhibitor_members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exhibitor_invitations (
  id varchar(36) NOT NULL,
  exhibitorId varchar(36) NOT NULL,
  email varchar(255) NOT NULL,
  role enum('OWNER','ADMIN','FINANCE','MANAGER','STAFF') NOT NULL,
  tokenHash varchar(64) NOT NULL,
  status enum('PENDING','ACCEPTED','EXPIRED','REVOKED') NOT NULL DEFAULT 'PENDING',
  expiresAt datetime NOT NULL,
  invitedBy int NULL,
  createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY UQ_exhibitor_invitation_token (tokenHash),
  KEY IDX_exhibitor_invitation_email (exhibitorId, email),
  CONSTRAINT FK_exhibitor_invitation_exhibitor FOREIGN KEY (exhibitorId) REFERENCES exhibitors(id) ON DELETE CASCADE,
  CONSTRAINT FK_exhibitor_invitation_user FOREIGN KEY (invitedBy) REFERENCES users(id) ON DELETE SET NULL
);
