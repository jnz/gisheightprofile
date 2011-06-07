/**
 * i18n: internationalization string lookup tables
 * description: add languages here in this file.
 * This file is UTF-8 encoded. Don't change this!
 * In Vim use e. g.:
 * :set fileencoding=utf-8
 */

var g_locale = "en"; // default to english

/**
 * function: setLocale(locale)
 * description: sets the current i18n setting.
 * parameters:
 * -    locale:    string of current language tag (e. g. "en", "de"...)
 */
function setLocale(locale)
{
    splitstr = locale.split("_");
    locale = splitstr[0];
    if(g_i18n[locale] != null)
        g_locale = locale;
}

/**
 * function: getI18Nstr(str, def)
 * description: gets a translated string from the lookup table
 * parameters:
 * -    str:    string of translation id
 * -    def:    default value, if no translation is found
 */
function getI18Nstr(str, def)
{
    var tbl = g_i18n[g_locale];
    if(tbl == null)
        return def;
    if(tbl[str] == null)
        return def;

    return tbl[str];
}

// English translations
var g_i18n_en =
{
    "numsep"         : ".",
    "googlephysical" : "Google Physical",
    "googlestreets"  : "Google Streets",
    "googlesat"      : "Google Satellite",
    "osm"            : "Open Street Maps",
    "mapcaption"     : "Map",
    "profiletool"    : "Height Profile Tool",
    "heightprofile"  : "Height Profile",
    "chooseexagg"    : "Choose Vertical Exaggeration",
    "maxexagg"       : "Max Vertical Exaggeration",
    "vertexagg"      : "Vertical Exaggeration",
    "heightinm"      : "Height [m]",
    "pathinkm"       : "Path [km]",
    "yaxis"          : "Y-Axis",
    "min"            : "Min",
    "max"            : "Max",
    "apply"          : "Apply",
    "height"         : "Height",
    "lat"            : "Latitude",
    "lon"            : "Longitude",
    "dir"            : "Direction",
    "north"          : "North",
    "northeast"      : "North-East",
    "east"           : "East",
    "southeast"      : "South-East",
    "south"          : "South",
    "southwest"      : "South-West",
    "west"           : "West",
    "northwest"      : "North-West",
    "nan"            : "Value is not a number",
    "biggerthan0"    : "Value must be bigger than 0",
    "biggerthanmax"  : "Value is bigger than max vertical exaggeration",
};

// German translations
var g_i18n_de =
{
    "numsep"         : ",",
    "googlephysical" : "Google Gelände",
    "googlestreets"  : "Google Straßenkarte",
    "googlesat"      : "Google Satellitenansicht",
    "osm"            : "Open Street Maps",
    "mapcaption"     : "Karte",
    "profiletool"    : "Höhenprofilwerkzeug",
    "heightprofile"  : "Höhenprofil",
    "chooseexagg"    : "Vertikale Überhöhung",
    "maxexagg"       : "Max. vertikale Überhöhung",
    "vertexagg"      : "Vertikale Überhöhung",
    "heightinm"      : "Höhe [m]",
    "pathinkm"       : "Pfad [km]",
    "yaxis"          : "Y-Achse",
    "min"            : "Min.",
    "max"            : "Max.",
    "apply"          : "Anwenden",
    "height"         : "Höhe",
    "lat"            : "Breitengrad",
    "lon"            : "Längengrad",
    "dir"            : "Richtung",
    "north"          : "Nord",
    "northeast"      : "Nord-Ost",
    "east"           : "Ost",
    "southeast"      : "Süd-Ost",
    "south"          : "Süden",
    "southwest"      : "Süd-West",
    "west"           : "Westen",
    "northwest"      : "Nord-West",
    "nan"            : "Wert ist keine Zahl",
    "biggerthan0"    : "Zahl muss größer als Null sein",
    "biggerthanmax"  : "Zahl ist größer als die max. vertikale Überhöhung",
};

// Spanish translations
var g_i18n_sp =
{
    "numsep"         : ".",
    "googlephysical" : "Google Físico",
    "googlestreets"  : "Google Rutas",
    "googlesat"      : "Google Satelital",
    "osm"            : "Open Street Maps",
    "mapcaption"     : "Mapa",
    "profiletool"    : "Herramienta para perfiles transversales de altura",
    "heightprofile"  : "Perfil de altura",
    "chooseexagg"    : "Seleccionar exageración vertical",
    "maxexagg"       : "Exageración vertical máxima",
    "vertexagg"      : "Exageración vertical",
    "heightinm"      : "Altura [m]",
    "pathinkm"       : "Ruta [km]",
    "yaxis"          : "Eje Y",
    "min"            : "Mín",
    "max"            : "Máx",
    "apply"          : "Aplicar",
    "height"         : "Altura",
    "lat"            : "Latitud",
    "lon"            : "Longitud",
    "dir"            : "Dirección",
    "north"          : "Norte",
    "northeast"      : "Noreste",
    "east"           : "Este",
    "southeast"      : "Sureste",
    "south"          : "Sur",
    "southwest"      : "Suroeste",
    "west"           : "Oeste",
    "northwest"      : "Noroeste",
    "nan"            : "Value is not a number",
    "biggerthan0"    : "Value must be bigger than 0",
    "biggerthanmax"  : "Value is bigger than max vertical exaggeration",
};

// French translations
var g_i18n_fr =
{
    "numsep"         : ".",
    "googlephysical" : "Google Physique",
    "googlestreets"  : "Google Routes",
    "googlesat"      : "Google Satellite",
    "osm"            : "Open Street Maps",
    "mapcaption"     : "Carte",
    "profiletool"    : "Outil de profil de hauteur",
    "heightprofile"  : "Profil de hauteur",
    "chooseexagg"    : "Choisir exagération verticale",
    "maxexagg"       : "Maximale exagération verticale",
    "vertexagg"      : "Exagération verticale",
    "heightinm"      : "Hauteur [m]",
    "pathinkm"       : "Route [km]",
    "yaxis"          : "Axe Y",
    "min"            : "Min",
    "max"            : "Max",
    "apply"          : "Appliquer",
    "height"         : "Hauteur",
    "lat"            : "Latitude",
    "lon"            : "Longitude",
    "dir"            : "Direction",
    "north"          : "Nord",
    "northeast"      : "Nord-est",
    "east"           : "Est",
    "southeast"      : "Sur-est",
    "south"          : "Sud",
    "southwest"      : "Sud-ouest",
    "west"           : "Ouest",
    "northwest"      : "Nord-ouest",
    "nan"            : "Value is not a number",
    "biggerthan0"    : "Value must be bigger than 0",
    "biggerthanmax"  : "Value is bigger than max vertical exaggeration",
};


// Translation registry
var g_i18n =
{
    "en": g_i18n_en,
    "de": g_i18n_de,
    "fr": g_i18n_fr,
    "sp": g_i18n_sp,
};

