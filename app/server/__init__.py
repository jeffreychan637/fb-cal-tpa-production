"""The sole purpose of this file is because it is necessary for the server
to exist. The runserver.py files that start the server cannot access the
files in this server directory without this init file. The creation of the
server directory is to keep the folder structure of this app as clean as
possible.
"""

from . import *

__author__ = "Jeffrey Chan"