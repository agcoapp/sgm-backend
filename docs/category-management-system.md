# 📂 Dynamic Category Management for TexteOfficiel

## 🎯 Overview

The SGM Backend now supports **dynamic category management** for official documents (TexteOfficiel), replacing the previous fixed enum-based system with a flexible, secretary-managed category system.

## ✨ Key Features

- **Dynamic Categories**: Secretaries can create, modify, and delete document categories
- **Mandatory Categories**: Every document must be assigned to a category before creation
- **Full CRUD Operations**: Complete category lifecycle management
- **Audit Trail**: All category operations are logged
- **Role-Based Access**: Only Secretaries and Presidents can manage categories
- **Clean Implementation**: No legacy enum support - categories are the only way to categorize documents

## 🏗️ Database Schema

### New Model: `CategorieTexteOfficiel`

```sql
model CategorieTexteOfficiel {
  id                 Int       @id @default(autoincrement())
  nom                String    @unique // Category name (e.g., "PV Réunion")
  description        String?   // Optional description
  
  // System fields
  cree_par           Int       // Secretary who created it
  cree_le            DateTime  @default(now())
  modifie_le         DateTime  @updatedAt
  est_actif          Boolean   @default(true)
  
  // Relations
  createur           Utilisateur @relation(fields: [cree_par], references: [id])
  textes_officiels   TexteOfficiel[] // Documents in this category
}
```

### Updated Model: `TexteOfficiel`

```sql
model TexteOfficiel {
  // ... existing fields ...
  id_categorie       Int       // MANDATORY - Dynamic category ID
  // ... rest of fields ...
  
  // Relations
  categorie          CategorieTexteOfficiel @relation(fields: [id_categorie], references: [id])
}
```

## 🚀 API Endpoints

### Category Management (`/api/categories-texte-officiel`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/` | Create new category | ✅ Secretary/President |
| `GET` | `/` | List all categories (with pagination) | ✅ Secretary/President |
| `GET` | `/statistiques` | Get category statistics | ✅ Secretary/President |
| `GET` | `/:id` | Get category details | ✅ Secretary/President |
| `PUT` | `/:id` | Update category | ✅ Secretary/President |
| `DELETE` | `/:id` | Delete category | ✅ Secretary/President |
| `PATCH` | `/:id/toggle` | Enable/disable category | ✅ Secretary/President |

### Updated TexteOfficiel Endpoints

The existing `/api/textes-officiels` endpoints now support:

- **Creating documents with categories**: Use `id_categorie` instead of `type_document`
- **Filtering by category**: Use `?id_categorie=1` parameter
- **Category information in responses**: Each document includes its category details

## 📝 Usage Examples

### 1. Create a New Category

```bash
POST /api/categories-texte-officiel
Authorization: Bearer <secretary-token>
Content-Type: application/json

{
  "nom": "PV Réunion",
  "description": "Procès-verbaux des réunions de l'association"
}
```

**Response:**
```json
{
  "message": "Catégorie créée avec succès",
  "categorie": {
    "id": 1,
    "nom": "PV Réunion",
    "description": "Procès-verbaux des réunions de l'association",
    "est_actif": true,
    "cree_le": "2024-01-15T10:30:00Z",
    "createur": {
      "nom_complet": "Marie Secrétaire",
      "nom_utilisateur": "marie.secretaire"
    }
  }
}
```

### 2. List Categories with Pagination

```bash
GET /api/categories-texte-officiel?page=1&limite=10&actif_seulement=true
Authorization: Bearer <secretary-token>
```

**Response:**
```json
{
  "message": "Liste des catégories récupérée",
  "donnees": {
    "categories": [
      {
        "id": 1,
        "nom": "PV Réunion",
        "description": "Procès-verbaux des réunions",
        "est_actif": true,
        "cree_le": "2024-01-15T10:30:00Z",
        "createur": {
          "nom_complet": "Marie Secrétaire",
          "nom_utilisateur": "marie.secretaire"
        },
        "nombre_textes": 5
      }
    ],
    "pagination": {
      "page": 1,
      "limite": 10,
      "total": 1,
      "pages_total": 1
    }
  }
}
```

### 3. Create Document with Category

```bash
POST /api/textes-officiels
Authorization: Bearer <secretary-token>
Content-Type: application/json

{
  "titre": "PV Réunion Janvier 2024",
  "description": "Procès-verbal de la réunion du 15 janvier 2024",
  "id_categorie": 1,
  "url_cloudinary": "https://res.cloudinary.com/...",
  "cloudinary_id": "sgm/pv_janvier_2024",
  "taille_fichier": 1024000,
  "nom_fichier_original": "pv_janvier_2024.pdf"
}
```

**Response:**
```json
{
  "message": "Texte officiel uploadé avec succès",
  "texte_officiel": {
    "id": 1,
    "titre": "PV Réunion Janvier 2024",
    "description": "Procès-verbal de la réunion du 15 janvier 2024",
    "type_document": "PV_REUNION",
    "type_document_label": "PV de Réunion",
    "categorie": {
      "id": 1,
      "nom": "PV Réunion",
    },
    "url_cloudinary": "https://res.cloudinary.com/...",
    "taille_fichier": 1024000,
    "nom_fichier_original": "pv_janvier_2024.pdf",
    "telecharge_le": "2024-01-15T11:00:00Z",
    "telecharge_par": {
      "prenoms": "Marie",
      "nom": "Secrétaire",
      "role": "SECRETAIRE_GENERALE"
    },
    "est_actif": true
  }
}
```

### 4. Filter Documents by Category

```bash
GET /api/textes-officiels?id_categorie=1&page=1&limite=20
Authorization: Bearer <member-token>
```

## 🔄 Migration Strategy

### Phase 1: Dual Support (Current)
- Both `type_document` (enum) and `id_categorie` (dynamic) are supported
- New documents can use either system
- Existing documents continue to work with enum values

### Phase 2: Gradual Migration
- Secretaries create categories matching existing enum values
- Documents can be migrated to use categories instead of enums
- Frontend can be updated to use the new category system

### Phase 3: Enum Deprecation (Future)
- Remove enum support once all documents are migrated
- Clean up deprecated code and database fields

## 🎨 Frontend Integration

### Category Selection Component

```javascript
// Fetch available categories
const categories = await fetch('/api/categories-texte-officiel?actif_seulement=true', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(res => res.json());

// Display categories with colors and icons
categories.donnees.categories.forEach(category => {
  const option = document.createElement('option');
  option.value = category.id;
  option.textContent = category.nom;
  // Add to dropdown
});
```

### Document Display with Categories

```javascript
// Display documents with category badges
documents.forEach(doc => {
  if (doc.categorie) {
    const categoryBadge = document.createElement('span');
    categoryBadge.textContent = doc.categorie.nom;
    categoryBadge.style.padding = '4px 8px';
    categoryBadge.style.borderRadius = '4px';
    categoryBadge.style.backgroundColor = '#f3f4f6';
    categoryBadge.style.color = '#374151';
    // Add to document element
  }
});
```

## 🔒 Security & Permissions

- **Category Management**: Only `SECRETAIRE_GENERALE` and `PRESIDENT` roles
- **Document Creation**: Only `SECRETAIRE_GENERALE` can upload documents
- **Document Viewing**: All authenticated users can view active documents
- **Audit Logging**: All category operations are logged with user details

## 📊 Statistics & Analytics

The system provides comprehensive statistics:

```bash
GET /api/categories-texte-officiel/statistiques
```

**Response includes:**
- Total categories count
- Active/inactive categories
- Categories with/without documents
- Top 5 categories by document count

## 🚨 Error Handling

The system provides detailed error responses:

```json
{
  "type": "business_error",
  "message": "Une catégorie avec ce nom existe déjà",
  "code": "CATEGORIE_EXISTANTE",
  "timestamp": "2024-01-15T10:30:00Z",
  "context": "create_category_name_check",
  "suggestions": [
    "Choisissez un nom différent pour la catégorie",
    "Ou modifiez la catégorie existante"
  ]
}
```

## 🧪 Testing

### Test Categories

Create these sample categories for testing:

```bash
# PV Réunions
{
  "nom": "PV Réunion",
  "description": "Procès-verbaux des réunions",
}

# Décisions
{
  "nom": "Décisions",
  "description": "Décisions du bureau",
}

# Comptes-Rendus
{
  "nom": "Comptes-Rendus",
  "description": "Comptes-rendus d'activités",
}

# Règlements
{
  "nom": "Règlements",
  "description": "Règlements et statuts",
}
```

## 📈 Benefits

1. **Flexibility**: Secretaries can create categories as needed
2. **Visual Appeal**: Custom colors and icons for better UX
3. **Organization**: Better document categorization and filtering
4. **Scalability**: No need to modify code for new document types
5. **Backward Compatibility**: Existing system continues to work
6. **Audit Trail**: Complete tracking of category operations

## 🔮 Future Enhancements

- **Category Templates**: Pre-defined category sets for different organizations
- **Category Hierarchies**: Parent-child category relationships
- **Category Permissions**: Fine-grained access control per category
- **Category Analytics**: Usage statistics and trends
- **Bulk Operations**: Mass category assignment and migration tools

---

**Implementation Date**: January 2024  
**Status**: ✅ Complete and Ready for Testing  
**Next Steps**: Database migration and frontend integration
