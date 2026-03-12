from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import date
from enum import Enum

# --- Shared Base Models ---

class TypeSolEnum(str, Enum):
    Sable = "Sable"
    Limon = "Limon"
    Argile = "Argile"

# --- Authentication Schemas ---

class SignupSchema(BaseModel):
    mail: EmailStr
    nom: str = Field(..., min_length=2, max_length=100)
    mot_de_passe: str = Field(..., min_length=8, max_length=128)

class LoginSchema(BaseModel):
    mail: EmailStr
    mot_de_passe: str = Field(..., min_length=1)

class PasswordChangeSchema(BaseModel):
    ancien_mot_de_passe: str = Field(..., min_length=1)
    nouveau_mot_de_passe: str = Field(..., min_length=8)
    confirmation: str = Field(..., min_length=8)

    @validator('confirmation')
    def passwords_match(cls, v, values, **kwargs):
        if 'nouveau_mot_de_passe' in values and v != values['nouveau_mot_de_passe']:
            raise ValueError('Le nouveau mot de passe et la confirmation ne correspondent pas')
        return v

class AgriculteurUpdateSchema(BaseModel):
    nom: Optional[str] = Field(None, min_length=2, max_length=100)
    mail: Optional[EmailStr] = None

# --- Parcelle Schemas ---

class ParcelleCreateSchema(BaseModel):
    surface: float = Field(..., gt=0)
    type_de_sol: TypeSolEnum
    capacite_eau: float = Field(..., gt=0)
    id_culture: Optional[int] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)

class ParcelleUpdateSchema(BaseModel):
    surface: Optional[float] = Field(None, gt=0)
    type_de_sol: Optional[TypeSolEnum] = None
    capacite_eau: Optional[float] = Field(None, gt=0)
    id_culture: Optional[int] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)

# --- Culture Schemas ---

class CultureBaseSchema(BaseModel):
    nom_culture: str = Field(..., min_length=2, max_length=80)
    besoin_eau_base: float = Field(..., gt=0)
    seuil_stress_hyd: float = Field(..., ge=0, le=100)
    coeff_sol_sable: float = Field(1.30, gt=0)
    coeff_sol_limon: float = Field(1.00, gt=0)
    coeff_sol_argile: float = Field(0.75, gt=0)

class CultureUpdateSchema(BaseModel):
    nom_culture: Optional[str] = Field(None, min_length=2, max_length=80)
    besoin_eau_base: Optional[float] = Field(None, gt=0)
    seuil_stress_hyd: Optional[float] = Field(None, ge=0, le=100)
    coeff_sol_sable: Optional[float] = Field(None, gt=0)
    coeff_sol_limon: Optional[float] = Field(None, gt=0)
    coeff_sol_argile: Optional[float] = Field(None, gt=0)

# --- Mesure Schemas ---

class MesureCreateSchema(BaseModel):
    id_parcelle: int
    date_prevision: date
    temperature: float = Field(..., ge=-50, le=60)
    pluie: float = Field(..., ge=0)
    humidite: Optional[float] = Field(None, ge=0, le=100)
    source_api: Optional[str] = Field("OpenMeteo", max_length=50)

class MesureUpdateSchema(BaseModel):
    temperature: Optional[float] = Field(None, ge=-50, le=60)
    pluie: Optional[float] = Field(None, ge=0)
    humidite: Optional[float] = Field(None, ge=0, le=100)
    source_api: Optional[str] = Field(None, max_length=50)
