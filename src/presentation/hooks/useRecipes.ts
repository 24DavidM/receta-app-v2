import { useEffect, useState } from "react";
import { Receta } from "../../domain/models/Receta";
import { RecipesUseCase } from "../../domain/useCases/recipes/RecipesUseCase";

const recipesUseCase = new RecipesUseCase();

export function useRecipes() {
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarRecetas();
  }, []);

  const cargarRecetas = async () => {
    setCargando(true);
    const data = await recipesUseCase.obtenerRecetas();
    setRecetas(data);
    setCargando(false);
  };

  const buscar = async (ingrediente: string) => {
    setCargando(true);
    const data = await recipesUseCase.buscarPorIngrediente(ingrediente);
    setRecetas(data);
    setCargando(false);
  };

  const crear = async (
    titulo: string,
    descripcion: string,
    ingredientes: string[],
    chefId: string,
    imagenUri?: string
  ) => {
    const resultado = await recipesUseCase.crearReceta(
      titulo,
      descripcion,
      ingredientes,
      chefId,
      imagenUri
    );
    if (resultado.success) {
      await cargarRecetas(); // Recargar la lista
    }
    return resultado;
  };

  const actualizar = async (
    id: string,
    titulo: string,
    descripcion: string,
    ingredientes: string[],
    imagenUri?: string
  ) => {
    const resultado = await recipesUseCase.actualizarReceta(
      id,
      titulo,
      descripcion,
      ingredientes
      , imagenUri
    );
    if (resultado.success) {
      await cargarRecetas();
    }
    return resultado;
  };

  const eliminar = async (id: string) => {
    const resultado = await recipesUseCase.eliminarReceta(id);
    if (resultado.success) {
      await cargarRecetas();
    }
    return resultado;
  };

  const seleccionarImagen = async () => {
    return await recipesUseCase.seleccionarImagen();
  };

  const tomarFoto = async () => {
    return await recipesUseCase.tomarFoto();
  };

  return {
    recetas,
    cargando,
    cargarRecetas,
    buscar,
    crear,
    actualizar,
    eliminar,
    seleccionarImagen,
    tomarFoto,
  };
}
