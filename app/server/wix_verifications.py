"""This file handles parsing the Wix Instance which is key to the security of
this app.
"""

from os import environ
from base64 import urlsafe_b64encode, urlsafe_b64decode
from hmac import new
from hashlib import sha256
from json import loads

if "HEROKU" in environ:
    wix_keys = environ["wix_keys"]
else:
    from secrets import wix_keys

__author__ = "Jeffrey Chan"

def instance_parser(instance):
    """This function parses the Wix instance that comes with every call to the
    server. If the parse is successful (the instance is from Wix and the
    permission is set to owner), the call is from a valid source and
    the request it came with should be performed. The function returns the
    parsed instance on success and false otherwise.
    """
    try:
        signature, encoded_json = instance.split(".", 2)
        encoded_json_with_padding = encoded_json + ('=' * (4 - (len(encoded_json) % 4)))
        parsed_instance = urlsafe_b64decode(
                          encoded_json_with_padding.encode("utf-8"))
        hmac_hashed = new(wix_keys["secret"], msg=encoded_json,
                       digestmod=sha256).digest()
        new_signature = urlsafe_b64encode(hmac_hashed).replace("=", "")
        if (new_signature == signature):
            return loads(parsed_instance)
        else:
            return False
    except Exception:
        return False
