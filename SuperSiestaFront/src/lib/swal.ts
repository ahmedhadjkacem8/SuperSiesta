import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

export const confirmDelete = async (title = "Êtes-vous sûr ?", text = "Cette action est irréversible !") => {
  const result = await MySwal.fire({
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Oui, supprimer",
    cancelButtonText: "Annuler",
    reverseButtons: true,
  });

  return result.isConfirmed;
};

export default MySwal;
