
CREATE TABLE users (
    user_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    email VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email_verified_at DATETIME(3) NULL,
    account_status VARCHAR(20) NOT NULL DEFAULT 'active',
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    query_history_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    suspended_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,

    PRIMARY KEY (user_id),
    UNIQUE KEY uq_users_email (email),

    CONSTRAINT chk_users_account_status
        CHECK (account_status IN ('active', 'suspended', 'pending_deletion')),
    CONSTRAINT chk_users_role
        CHECK (role IN ('user', 'admin')),
    CONSTRAINT chk_users_suspended_at
        CHECK (
            (account_status = 'suspended' AND suspended_at IS NOT NULL)
            OR
            (account_status <> 'suspended' AND suspended_at IS NULL)
        )
) ENGINE=InnoDB
  DEFAULT CHARACTER SET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE sessions (
    session_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    token_hash BINARY(32) NOT NULL,
    created_at DATETIME(3) NOT NULL,
    last_activity_at DATETIME(3) NOT NULL,
    idle_expires_at DATETIME(3) NOT NULL,
    absolute_expires_at DATETIME(3) NOT NULL,
    revoked_at DATETIME(3) NULL,
    revocation_reason VARCHAR(40) NULL,

    PRIMARY KEY (session_id),
    UNIQUE KEY uq_sessions_token_hash (token_hash),
    KEY idx_sessions_user_id (user_id),
    KEY idx_sessions_absolute_expires_at (absolute_expires_at),

    CONSTRAINT fk_sessions_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_sessions_revocation_pair
        CHECK (
            (revoked_at IS NULL AND revocation_reason IS NULL)
            OR
            (revoked_at IS NOT NULL AND revocation_reason IS NOT NULL)
        ),

    CONSTRAINT chk_sessions_revocation_reason
        CHECK (
            revocation_reason IS NULL
            OR revocation_reason IN (
                'logout',
                'password_change',
                'account_suspended',
                'admin_action',
                'security_event'
            )
        ),

    CONSTRAINT chk_sessions_expiry_order
        CHECK (
            idle_expires_at > created_at
            AND absolute_expires_at > created_at
            AND idle_expires_at <= absolute_expires_at
        ),

    CONSTRAINT chk_sessions_activity_order
        CHECK (last_activity_at >= created_at),

    CONSTRAINT chk_sessions_revoked_order
        CHECK (revoked_at IS NULL OR revoked_at >= created_at)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE connections (
    connection_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    connection_name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci NOT NULL,
    host VARCHAR(255) NOT NULL,
    port SMALLINT UNSIGNED NOT NULL DEFAULT 3306,
    database_name VARCHAR(255) NULL,
    username VARCHAR(255) NOT NULL,
    encrypted_password BLOB NULL,
    encryption_nonce BINARY(12) NULL,
    encryption_auth_tag BINARY(16) NULL,
    encryption_key_version VARCHAR(50) NULL,
    last_tested_at DATETIME(3) NULL,
    last_test_status VARCHAR(20) NULL,
    config_version BIGINT UNSIGNED NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,

    PRIMARY KEY (connection_id),
    UNIQUE KEY uq_connections_user_name (user_id, connection_name),

    CONSTRAINT fk_connections_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_connections_port
        CHECK (port BETWEEN 1 AND 65535),

    CONSTRAINT chk_connections_config_version
        CHECK (config_version >= 1),

    CONSTRAINT chk_connections_name_not_blank
        CHECK (CHAR_LENGTH(TRIM(connection_name)) BETWEEN 1 AND 100),

    CONSTRAINT chk_connections_credentials
        CHECK (
            (
                encrypted_password IS NULL
                AND encryption_nonce IS NULL
                AND encryption_auth_tag IS NULL
                AND encryption_key_version IS NULL
            )
            OR
            (
                encrypted_password IS NOT NULL
                AND encryption_nonce IS NOT NULL
                AND encryption_auth_tag IS NOT NULL
                AND encryption_key_version IS NOT NULL
            )
        ),

    CONSTRAINT chk_connections_test_result
        CHECK (
            (last_tested_at IS NULL AND last_test_status IS NULL)
            OR
            (
                last_tested_at IS NOT NULL
                AND last_test_status IN ('successful', 'failed')
            )
        )
) ENGINE=InnoDB
  DEFAULT CHARACTER SET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE query_history (
    history_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    connection_id BIGINT UNSIGNED NULL,
    connection_name_snapshot VARCHAR(100) NOT NULL,
    sql_statement LONGTEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'running',
    execution_time_ms DECIMAL(12,3) NULL,
    rows_returned BIGINT UNSIGNED NULL,
    rows_affected BIGINT UNSIGNED NULL,
    error_code VARCHAR(100) NULL,
    error_message TEXT NULL,
    accepted_at DATETIME(3) NOT NULL,
    executed_at DATETIME(3) NULL,
    completed_at DATETIME(3) NULL,

    PRIMARY KEY (history_id),
    KEY idx_history_user_accepted (user_id, accepted_at, history_id),
    KEY idx_history_user_status_accepted (user_id, status, accepted_at),
    KEY idx_history_user_connection_accepted (user_id, connection_id, accepted_at),
    KEY idx_history_connection_id (connection_id),
    KEY idx_history_accepted_at (accepted_at),

    CONSTRAINT fk_history_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_history_connection
        FOREIGN KEY (connection_id) REFERENCES connections (connection_id)
        ON DELETE SET NULL,

    CONSTRAINT chk_history_status
        CHECK (status IN ('running', 'successful', 'failed', 'cancelled')),

    CONSTRAINT chk_history_execution_time
        CHECK (execution_time_ms IS NULL OR execution_time_ms >= 0),

    CONSTRAINT chk_history_timestamp_order
        CHECK (
            (executed_at IS NULL OR executed_at >= accepted_at)
            AND
            (completed_at IS NULL OR completed_at >= accepted_at)
            AND
            (completed_at IS NULL OR executed_at IS NULL OR completed_at >= executed_at)
        ),

    CONSTRAINT chk_history_completion_state
        CHECK (
            (status = 'running' AND completed_at IS NULL)
            OR
            (status IN ('successful', 'failed', 'cancelled') AND completed_at IS NOT NULL)
        )
) ENGINE=InnoDB
  DEFAULT CHARACTER SET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE email_verification_tokens (
    token_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    token_hash BINARY(32) NOT NULL,
    purpose VARCHAR(20) NOT NULL,
    pending_email VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci NULL,
    expires_at DATETIME(3) NOT NULL,
    used_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL,

    PRIMARY KEY (token_id),
    UNIQUE KEY uq_email_tokens_hash (token_hash),
    KEY idx_email_tokens_user_purpose_created (user_id, purpose, created_at),
    KEY idx_email_tokens_expires_at (expires_at),

    CONSTRAINT fk_email_tokens_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_email_tokens_purpose
        CHECK (purpose IN ('registration', 'email_change')),

    CONSTRAINT chk_email_tokens_pending_email
        CHECK (
            (purpose = 'registration' AND pending_email IS NULL)
            OR
            (purpose = 'email_change' AND pending_email IS NOT NULL
                AND CHAR_LENGTH(TRIM(pending_email)) > 0)
        ),

    CONSTRAINT chk_email_tokens_expiry
        CHECK (expires_at > created_at),

    CONSTRAINT chk_email_tokens_used_at
        CHECK (used_at IS NULL OR used_at >= created_at)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;


