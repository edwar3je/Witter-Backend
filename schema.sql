CREATE TABLE users (
    handle VARCHAR(30) UNIQUE PRIMARY KEY,
    username VARCHAR(30) NOT NULL,
    password VARCHAR(90) NOT NULL,
    email VARCHAR(50) NOT NULL,
    user_description VARCHAR(250) DEFAULT 'A default user description',
    profile_image VARCHAR(300) DEFAULT 'A default profile image',
    banner_image VARCHAR(300) DEFAULT 'A default banner image'
);

CREATE TABLE weets (
    id SERIAL PRIMARY KEY,
    weet VARCHAR(250) NOT NULL,
    author text REFERENCES users ON DELETE CASCADE,
    time_date TIMESTAMPTZ NOT NULL
);

CREATE TABLE followers (
    id SERIAL PRIMARY KEY,
    follower_id text REFERENCES users ON DELETE CASCADE,
    followee_id text REFERENCES users ON DELETE CASCADE
);

CREATE TABLE favorites (
    id SERIAL PRIMARY KEY,
    weet_id INTEGER REFERENCES weets ON DELETE CASCADE,
    user_id text REFERENCES users ON DELETE CASCADE,
    time_date TIMESTAMPTZ NOT NULL
);

CREATE TABLE reweets (
    id SERIAL PRIMARY KEY,
    weet_id INTEGER REFERENCES weets ON DELETE CASCADE,
    user_id text REFERENCES users ON DELETE CASCADE,
    time_date TIMESTAMPTZ NOT NULL
);

CREATE TABLE tabs (
    id SERIAL PRIMARY KEY,
    weet_id INTEGER REFERENCES weets ON DELETE CASCADE,
    user_id text REFERENCES users ON DELETE CASCADE,
    time_date TIMESTAMPTZ NOT NULL
);