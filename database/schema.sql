CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    author VARCHAR(255),
    year_published VARCHAR(50),
    category VARCHAR(100),
    summary TEXT,
    source_url TEXT,
    is_sample BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE people (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    birth_year VARCHAR(50),
    death_year VARCHAR(50),
    description TEXT,
    period VARCHAR(255),
    is_sample BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    event_date VARCHAR(100),
    event_year INTEGER,
    century INTEGER,
    location VARCHAR(255),
    state VARCHAR(255),
    period VARCHAR(255),
    description TEXT,
    is_sample BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE maps (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    period VARCHAR(255),
    description TEXT
);