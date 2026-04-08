Pegá estas reglas en Firestore para que solo usuarios autenticados puedan leer y escribir ventas:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /app_state/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Ruta en Firebase:

1. Firestore Database
2. Reglas
3. Reemplazar el contenido
4. Publicar

Con esta configuración, cada usuario autenticado guarda sus ventas en su propio documento y no puede leer el de otro usuario.
