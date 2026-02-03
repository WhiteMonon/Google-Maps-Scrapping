from pydantic import BaseModel

class Lead(BaseModel):
    name: str
    address: str = "N/A"
    website: str = "N/A"
    phone: str = "N/A"
    keyword: str
