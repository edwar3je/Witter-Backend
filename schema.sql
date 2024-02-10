CREATE TABLE users (
    handle VARCHAR(20) UNIQUE PRIMARY KEY,
    username VARCHAR(20) NOT NULL,
    password VARCHAR(90) NOT NULL,
    email text NOT NULL,
    user_description VARCHAR(250) DEFAULT 'A default user description',
    profile_image VARCHAR(300) DEFAULT 'https://i.pinimg.com/736x/fb/1d/d6/fb1dd695cf985379da1909b2ceea3257.jpg',
    banner_image VARCHAR(300) DEFAULT 'https://cdn.pixabay.com/photo/2017/08/30/01/05/milky-way-2695569_640.jpg'
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