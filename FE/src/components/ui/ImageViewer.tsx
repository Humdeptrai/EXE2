import { Viewer } from "../feedback/IdentityImageViewer";

export default function ImageViewer({ image, onClose }: { image: { url: string; name: string }; onClose: () => void }) {
  return <Viewer key={image.url} src={image.url} alt={image.name} close={onClose} />;
}
