"""This file handles all the interactions with the Database using the peewee
package.
"""

from os import environ
from urlparse import uses_netloc, urlparse
from peewee import Model, MySQLDatabase, CharField, TextField, \
                   CompositeKey, PostgresqlDatabase

__author__ = "Jeffrey Chan"

"""The database type is defined here. For development, I have used a MySQL DB,
but the production version of this app uses a Heroku Postgres DB. If you need to
change the DB for whatever reason, just change the line defining "db", providing
the neccesary information to connect to that database.
"""

if "HEROKU" in environ:
    uses_netloc.append("postgres")
    url = urlparse(environ["DATABASE_URL"])
    DATABASE = {
        "name": url.path[1:],
        "user": url.username,
        "password": url.password,
        "host": url.hostname,
        "port": url.port,
    }
    db = PostgresqlDatabase(DATABASE["name"], user=DATABASE["user"], 
                                              password=DATABASE["password"],
                                              host=DATABASE["host"],
                                              port=DATABASE["port"])
    db.get_conn().set_client_encoding('UTF8')
else:
    db = MySQLDatabase("fbCalDB", user="root")


class BaseModel(Model):
    """This is the base model that all tables in the database will follow. It
    simply outlines that all tables will be a part of the database "db".
    """
    class Meta:
        database = db


class Users(BaseModel):
    """Users is the main - and right now only - table in the DB. It stores the
    information of each app in use. 

    The columns of Users are Wix coponent ID, Wix instance ID, user settings,
    events saved by the user to be placed on their list or calendar, and their
    long term Facebook access token data.

    The primary keys of Users are the component ID and the instance ID.
    """
    compID = CharField(max_length = 50)
    instanceID = CharField(max_length = 50)
    settings = TextField()
    events = TextField()
    access_token_data = TextField()

    class Meta:
        # order_by = ("instanceID, compID")
        primary_key = CompositeKey('instanceID', 'compID')

def closeDB():
    """This closes the connection to the Database and returns whether or not it
    was successful.
    """
    try:
        db.close()
    except Exception, e:
        print e
        return False
    else:
        return True

def save_settings(compID, info, datatype):
    """This saves the data of the app into the database. It will first check if
    the app exists or not in the database. If so, it updates that row with the
    new info depending on what data type is being saved. If not, it creates a
    new row, filling out each column with as much data as possible.
    """
    try:
        db.connect()
        instanceID = info["instance"]
        entry = Users.select().where((Users.instanceID == instanceID) & \
                            (Users.compID == compID)).get()
        if datatype == "access_token":
            entry.access_token_data = info["access_token"]
        else:
            entry.settings = info["settings"]
            entry.events = info["events"]
        entry.save()
        return closeDB();
    except Users.DoesNotExist:
        print "user didn't exist"
        try:
            instance = info["instance"]
            if datatype == "access_token":
                settings = ""
                events = ""
                access_token_data = info["access_token"]
            else:
                settings = info["settings"]
                events = info["events"]
                access_token_data = ""
            Users.create(compID = compID, instanceID = instance, \
                         settings = settings, events = events,
                         access_token_data = access_token_data)
            return closeDB()
        except Exception, e:
            print e
            closeDB()
            return False
    except Exception, e:
        print e
        closeDB()
        return False

def get_settings(compID, instanceID):
    """This gets the settings of the app with the given component ID and
    instance ID. If no row is found, it returns False. On failures, it returns
    None.
    """
    try:
        db.connect()
        entry = Users.select().where((Users.instanceID == instanceID) & \
                            (Users.compID == compID)).get()
        return entry
    except Users.DoesNotExist:
        closeDB()
        return False
    except Exception, e:
        print e
        closeDB()
        return None

def delete_info(compID, instanceID):
    """This deletes the user's saved events and access token data from the
    database, but does not remove other information. It is used when the user
    logs out of their Facebook account in the settings panel.
    """
    try:
        db.connect()
        entry = Users.select().where((Users.instanceID == instanceID) & \
                            (Users.compID == compID)).get()
        entry.access_token_data = ""
        entry.events = ""
        entry.save()
        return closeDB()
    except Exception, e:
        print e
        closeDB()
        return False
