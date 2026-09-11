package com.koda.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Profesional o administrador autorizado para usar KODA. */
@Entity
@Table(name = "usuarios")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String nombre;

    @Column(nullable = false, unique = true)
    private String correo;

    @Column(nullable = false, unique = true)
    private String usuario;

    /** Hash BCrypt de la contrasena; nunca se expone en las respuestas. */
    @Column(nullable = false)
    private String contrasena;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Rol rol;

    /** Registro medico profesional; solo aplica al rol MEDICO. */
    private String matricula;

    private String especialidad;

    private String institucion;

    @Column(nullable = false)
    private boolean activo = true;

    protected Usuario() {
        // requerido por JPA
    }

    public Usuario(String nombre, String correo, String usuario, String contrasena, Rol rol,
                   String matricula, String especialidad, String institucion) {
        this.nombre = nombre;
        this.correo = correo;
        this.usuario = usuario;
        this.contrasena = contrasena;
        this.rol = rol;
        this.matricula = matricula;
        this.especialidad = especialidad;
        this.institucion = institucion;
    }

    /** Iniciales que muestra la cabecera de la aplicacion. */
    public String getIniciales() {
        String[] partes = nombre.replace("Dr. ", "").replace("Dra. ", "").trim().split("\s+");
        if (partes.length == 1) {
            return partes[0].substring(0, Math.min(2, partes[0].length())).toUpperCase();
        }
        return ("" + partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
    }

    public String getId() {
        return id;
    }

    public String getNombre() {
        return nombre;
    }

    public String getCorreo() {
        return correo;
    }

    public String getUsuario() {
        return usuario;
    }

    public String getContrasena() {
        return contrasena;
    }

    public Rol getRol() {
        return rol;
    }

    public String getMatricula() {
        return matricula;
    }

    public String getEspecialidad() {
        return especialidad;
    }

    public String getInstitucion() {
        return institucion;
    }

    public boolean isActivo() {
        return activo;
    }

    public void setActivo(boolean activo) {
        this.activo = activo;
    }
}
