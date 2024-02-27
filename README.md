# Witter (Backend)

Link: https://witter-backend-m74t.onrender.com

ERD: https://lucid.app/lucidchart/d6c901d2-60ee-4888-9f9d-115dc716c04a/edit?viewport_loc=-487%2C-1423%2C2518%2C1466%2C0_0&invitationId=inv_f8429b10-abaa-4e28-81ed-537d92c2230f

## Description:

Witter is a Twitter clone built using Node.js (backend) and React (frontend). This portion of the project is the backend, which manages CRUD functionality
required to run the application and generates tokens required for authorization on the frontend. For information regarding the frontend, view the README.md
file for Witter-Frontend at https://github.com/edwar3je/Witter-Frontend.

## API:

Note: Most routes in this API require a valid json web token (JWT) that originates from the API to be sent within the body of the request. These tokens are issued by the '/account/sign-up', '/account/log-in' and '/profile/:handle/edit' routes.

  - '/account'
    - 'POST /sign-up'
      - Creates a user account on the backend and generates a valid JWT used for authorization.
      - request: axios.post(`${BASE_URL}/account/sign_up`, { handle, username, password, email })
      - output: { token }
    - 'POST /log-in'
      - Examines a user's credentials and provides a valid JWT if credentials are valid.
      - request: axios.post(`${BASE_URL}/account/log-in`, { handle, password })
      - output: { token }
  - '/profile'
    - 'POST /:handle'
      - Returns information on a user's profile depending on handle provided (Token required).
      - request: axios.post(`${BASE_URL}/profile/${handle}`, { _token })
      - output: { user }
    - 'PUT /:handle/edit'
      - Updates a user's profile if the handle provided matches the user handle in the token. Returns a JWT containing the new user's information (Token required).
      - request: axios.put(`${BASE_URL}/profile/${handle}/edit`, { _token, username, oldPassword, newPassword, email, userDescription, profilePicture, bannerPicture })
      - output: { token }
    - 'DELETE /:handle/edit'
      - Deletes a user's profile if the handle provided matches the user handle in the token (Token required).
      - request: axios.delete(`${BASE_URL}/profile/${handle}/edit`, { data: { _token } })
      - output: { message: 'account successfully deleted' }
    - 'POST /:handle/weets'
      - Returns an array of weets written by the account matching the handle (Token required).
      - request: axios.post(`${BASE_URL}/profile/${handle}/weets`, { _token })
      - output: { result }
    - 'POST /:handle/reweets'
      - Returns an array of weets the account matching the handle has reweeted (Token required).
      - request: axios.post(`${BASE_URL}/profile/${handle}/reweets`, { _token })
      - output: { result }
    - 'POST /:handle/favorites'
      - Returns an array of weets the account matching the handle has favorited (Token required).
      - request: axios.post(`${BASE_URL}/profile/${handle}/favorites`, { _token })
      - output: { result }
    - 'POST /:handle/tabs'
      - Returns an array of weets the account matching the handle has tabbed (Token required).
      - request: axios.post(`${BASE_URL}/profile/${handle}/tabs`, { _token })
      - output: { result }
    - 'POST /:handle/following'
      - Returns an array of accounts that the account matching the handle is currently following (Token required).
      - request: axios.post(`${BASE_URL}/profile/${handle}/following`, { _token })
      - output: { result }
    - 'POST /:handle/followers'
      - Returns an array of accounts that are currently following the account matching the handle (Token required).
      - request: axios.post(`${BASE_URL}/profile/${handle}/followers`, { _token })
      - output: { result }
  - '/users'
    - 'POST /:search'
      - Returns an array of accounts with usernames that match (case insensitive) the string provided (Token required).
      - request: axios.post(`${BASE_URL}/users/${search}`, { _token })
      - output: { result }
    - 'POST /:handle/follow'
      - Allows the current user to follow another account they are not currently following (Token required).
      - request: axios.post(`${BASE_URL}/users/${handle}/follow`, { _token })
      - output: { message: `You are now following ${handle}` }
    - 'POST /:handle/unfollow'
      - Allows the currrent user to unfollow another account they are currently following (Token required).
      - request: axios.post(`${BASE_URL}/users/${handle}/unfollow`, { _token })
      - output: { message: `You are no longer following ${handle}` }
  - '/weets'
    - 'POST /'
      - Allows a user to create a new weet (Token required).
      - request: axios.post(`${BASE_URL}/weets/`, { _token })
      - output: { message: 'Weet successfully created' }
    - 'POST /feed'
      - Returns an array of weets published by the current user along with accounts the user follows (Token required).
      - request: axios.post(`${BASE_URL}/weets/feed`, { _token })
      - output: { result }
    - 'POST /:id'
      - Returns information on a specific weet based on id provided (Token required).
      - request: axios.post(`${BASE_URL}/weets/${id}`, { _token })
      - output: { result }
    - 'PUT /:id'
      - Allows a user to edit one of their own weets based on id provided (Token required).
      - request: axios.put(`${BASE_URL}/weets/${id}`, { _token })
      - output: { message: 'Weet successfully edited' }
    - 'DELETE /:id'
      - Allows a user to delete one of their own weets based on id provided (Token required).
      - request: axios.delete(`${BASE_URL}/weets/${id}`, { _token })
      - output: { result }
    - 'POST /:id/reweet'
      - Allows a user to reweet a weet they have not reweeted based on id provided (Token required).
      - request: axios.post(`${BASE_URL}/weets/${id}/reweet`, { _token })
      - output: { message: 'Weet successfully reweeted' }
    - 'POST /:id/unreweet'
      - Allows a user to unreweet a weet they have reweeted based on id provided (Token required).
      - request: axios.post(`${BASE_URL}/weets/${id}/unreweet`, { _token })
      - output: { message: 'Reweet successfully removed' }
    - 'POST /:id/favorite'
      - Allows a user to favorite a weet they have not favorited based on id provided (Token required).
      - request: axios.post(`${BASE_URL}/weets/${id}/favorite`, { _token })
      - output: { message: 'Weet successfully favorited' }
    - 'POST /:id/unfavorite'
      - Allows a user to unfavorite a weet they have favorited based on id provided (Token required).
      - request: axios.post(`${BASE_URL}/weets/${id}/unfavorite`, { _token })
      - output: { message: 'Favorite successfully removed' }
    - 'POST /:id/tab'
      - Allows a user to tab a weet they have not tabbed based on id provided (Token required).
      - request: axios.post(`${BASE_URL}/weets/${id}/tab`, { _token })
      - output: { message: 'Weet successfully tabbed' }
    - 'POST /:id/untab'
      - Allows a user to untab a weet they have tabbed based on id provided (Token required).
      - request: axios.post(`${BASE_URL}/weets/${id}/untab`, { _token })
      - output: { message: 'Tab successfully removed' }
  - '/validate'
    - 'POST /sign-up'
      - Returns an object containing information on if data submitted for registering a new account is valid.
      - request: axios.post(`${BASE_URL}/validate/sign-up`, { handle, username, password, email })
      - output: { result }
    - 'POST /update-profile/:handle'
      - Returns an object containing information on if data submitted for editing a profile is valid (Token required)
      - request: axios.post(`${BASE_URL}/validate/update-profile/${handle}`, { _token, username, oldPassword, newPassword, email, userDescription, profilePicture, bannerPicture })
      - output: { result }

## Tools/Packages Used:

 - express:
   - The backend framework for the application, primarily used to handle all requests.
 - bcrypt:
   - A package used with express to create encrypted, fixed-value passwords, as well as
   provide authentication via comparing unencrypted passwords against stored encrypted
   passwords.
 - cors:
   - A package that is used as middleware to allow for cross-origin resource sharing (CORS) to bypass CORS restrictions on browsers when making requests from an external source.
 - dotenv:
   - A package that loads environment variables from a .env file.
 - jsonwebtoken:
   - A package used with express to generate, decrypt and compare json web tokens (JWTs).
 - pg:
   - A package that provides a pure Javascript client between PostgreSQL and express.
   Provides back-and-forth CRUD functionality.
 - supertest:
   - A package that provides an easy means of testing http requests made to routes in
   the Witter API.
 - jest:
   - The primary means of building and executing tests on the backend.
 

## How to Set Up:

Assuming you have the application folder installed on your computer, use your preferred terminal to access the directory. Once inside the directory, install all dependencies using the command 'npm install' (if you do not have 'npm' already installed in your terminal, please do so). Once the dependencies have been installed, the only step left to activate the application is to configure your database. 

To configure your database, you'll first need to create your build and test databases in postgresql (I recommend using psql inside your terminal). First, activate psql inside your terminal (type 'sudo service postgresql start' followed by your password), then type the following command 'psql < schema.sql'. This will create both the databases and the necessary tables to store data. Once the command has been run, you can test if the databases have been created by using the command '\c' followed by the name of one of the databases (either 'witter' or 'witter_test'). If succesfull, you should connect to the database and be able to view any existing tables using the command '\dt'.

Once your databases have been built, you can begin to test your application. Please note that all testing requires 'jest' to be installed globally (if you have not installed jest on your computer, please do so now). To run a test, simply type 'jest' followed by the file you wish to run (make sure to include the full name of the file). Please also note that it is not recommended to run all test files at once as the tests will fail, and that some of the test files might take a while to run individually (especially routes.test.js).

If you wish to 'run' the backend, simply type 'npm start' in the terminal while in the directory containing the application. Please note that if you do not have psql active, the application will not run and instead return an error.