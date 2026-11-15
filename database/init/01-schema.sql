CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    capacity INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE availability (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    day_of_week SMALLINT,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL
);

CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    duration_minutes INT NOT NULL,
    requested_window_start TIMESTAMP NOT NULL,
    requested_window_end TIMESTAMP NOT NULL,
    required_capacity INT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
        priority SMALLINT NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
    scheduled_start TIMESTAMP,
    scheduled_end TIMESTAMP,
    room_id INT REFERENCES rooms(id),
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE event_participants (
    id SERIAL PRIMARY KEY,
    event_id INT REFERENCES events(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    is_mandatory BOOLEAN DEFAULT FALSE,
    UNIQUE(event_id, user_id)
);

INSERT INTO rooms (name, capacity) VALUES
    ('Room A', 10),
    ('Room B', 30),
    ('Room C', 100);
