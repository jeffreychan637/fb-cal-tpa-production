"""These status codes are used when replying to requests from the client side.
They are placed here with corresponding names that explain their meaning in
order to make the server code for the REST API more reader friendly.
"""

__author__ = "Jeffrey Chan"

STATUS = {
  "OK" : 200,
  "Bad_Request" : 400,
  "Unauthorized" : 401,
  "Forbidden" : 403,
  "Not_Found" : 404,
  "Internal_Server_Error" : 500,
  "Bad_Gateway" : 502 #facebook server returned problem
}