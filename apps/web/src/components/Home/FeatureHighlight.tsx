// src/components/public/FeatureHighlight.tsx
interface FeatureHighlightProps {
    title: string
    description: string
    image?: string
    reverse?: boolean
  }
  
  export default function FeatureHighlight({ title, description, image, reverse = false }: FeatureHighlightProps) {
    return (
      <div className={`row align-items-center my-5 ${reverse ? 'flex-row-reverse' : ''}`}>
        <div className="col-md-6">
          <h2 className="fw-bold">{title}</h2>
          <p className="text-secondary">{description}</p>
        </div>
        {image && (
          <div className="col-md-6 text-center">
            <img src={image} alt={title} className="img-fluid rounded shadow" />
          </div>
        )}
      </div>
    )
  }