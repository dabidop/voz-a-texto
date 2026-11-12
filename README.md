# Voz a texto

Aplicación de escritorio sencilla para transcribir audios con Whisper local, sin API, cuentas ni pagos.

## Ejecutar

```bash
npm install
npm start
```

La aplicación no guarda audios ni claves. El modelo `whisper-tiny` se descarga automáticamente la primera vez (aprox. 150 MB) y luego la transcripción se realiza en tu propio equipo. Los temporales se eliminan al finalizar.
