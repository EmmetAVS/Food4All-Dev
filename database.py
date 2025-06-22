import json
import time
from threading import Lock
import hashlib

class Database:
    def __init__(self, filename: str = 'database.json'):

        print("loading database")
        self.filename = filename
        self.lock = Lock()
        self.data = {}
        self.load()

    def load(self):
        try:
            with self.lock:
                with open(self.filename, 'r') as file:
                    self.data = json.load(file)
        except (FileNotFoundError, json.JSONDecodeError):
            self.data = {
                "users": {},
                "branches": {},
                "collections": {},
            }

    def save(self):
        with self.lock:
            with open(self.filename, 'w') as file:
                json.dump(self.data, file, indent=4)

    def get(self, keys: str | list[str]):
        data = self.data
        if isinstance(keys, str):
            return data[keys]
        else:
            expression = f'''data{"".join([f"['{k}']" for k in keys])}'''
            return eval(expression)
        
    def set(self, keys: str | list[str], value):
        data = self.data
        if isinstance(keys, str):
            data[keys] = value
        else:
            expression = f'''data{"".join([f"['{k}']" for k in keys])} = {f"'{value}'" if isinstance(value, str) else value}'''
            exec(expression)
        self.save()

class User:

    """
    "token1": {
        "username": "user1",
        "token": "token1",
        "created": "timestamp",
        "email": "email1",
        created_collections: count (int),
        branch: "branch1",
        is_admin: true/false
    }
    """

    @staticmethod
    def get_token(username: str, password: str):
        obj = hashlib.sha256((username + password).encode())
        return obj.hexdigest()

    @staticmethod
    def create_user(db: Database, username: str, password: str, email: str, branch: str):
        token = User.get_token(username, password)
        if token in db.get("users") :
            raise Exception("User already exists")
    
        if not username or not password or not email:
            raise Exception("Username, password, and email are required")

        if branch not in db.get("branches") and branch != "":
            raise Exception("Branch does not exist")
        
        for user in db.get("users").values():
            if user["username"] == username:
                raise Exception("Username already exists")
            if user["email"] == email:
                raise Exception("Email already exists")

        else:
            db.set(["users", token], {
                "username": username,
                "token": token,
                "created": time.time(),
                "email": email,
                "collections": 0,
                "branch": branch,
                "is_admin": False
            })

            if branch != "":
                members = db.get(["branches", branch, "members"])
                members.append(username)
                db.set(["branches", branch, "members"], members)
            
            return db.get(["users", token])

    @staticmethod
    def login(db: Database, username: str, password: str):
        token = User.get_token(username, password)
        if token in db.get("users"):
            return db.get(["users", token])
        else:
            raise Exception("Invalid username or password")
        
    @staticmethod
    def is_admin(db: Database, token: str):
        if token in db.get("users"):
            return db.get(["users", token, "is_admin"])
        else:
            raise Exception("User does not exist")
        
class Branch:
    """
    "branch1": {
        "name": "branch1",
        acronym: "acronym1"
        "created": "timestamp",
        "members": ["user1", "user2"],
        "collections": count (int)
    }
    """

    @staticmethod
    def create_branch(db: Database, name: str, acronym: str):

        if not name or not acronym:
            raise Exception("Branch name and acronym are required")

        if name in db.get("branches"):
            raise Exception("Branch already exists")
        else:
            db.set(["branches", name], {
                "name": name,
                "created": time.time(),
                "acronym": acronym,
                "members": [],
                "collections": 0
            })

class Collection:

    """
    collectionid1: {
        "id": "collectionid1",
        "created": "timestamp",
        "submitted_by": "username1",
        "branch": "branch1",
        "timestamp": "timestamp",
        "source": "source",
        "quantity": "quantity",
        "status": "status"
    }
    """

    @staticmethod
    def create_collection(db: Database, token: str, branch: str, timestamp: int, source: str, quantity: int, status: str):
        
        if not status or status not in ["donated", "collected", "planned"]:
            raise Exception("Invalid status")
        
        if not branch or branch not in db.get("branches"):
            raise Exception("Branch does not exist")
        
        if not token or token not in db.get("users"):
            raise Exception("User does not exist")
        
        username = db.get(["users", token, "username"])
        if not username:
            raise Exception("User does not exist or is not logged in")

        collection = {
            "id": hashlib.sha256((username + branch + str(timestamp) + str(time.time())).encode()).hexdigest(),
            "created": time.time(),
            "submitted_by": username,
            "branch": branch,
            "timestamp": timestamp,
            "source": source,
            "quantity": quantity,
            "status": status
        }

        collections = db.get("collections")
        collections[collection["id"]] = collection
        db.set(["collections"], collections)
        db.set(["branches", branch, "collections"], db.get(["branches", branch, "collections"]) + 1)
        db.set(["users", token, "collections"], db.get(["users", token, "collections"]) + 1)
