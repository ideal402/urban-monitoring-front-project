import DeckGL from '@deck.gl/react';
import MapGL from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapContainerProps {
  viewState: {
    longitude: number;
    latitude: number;
    zoom: number;
    pitch: number;
    bearing: number;
    minZoom: number;
    maxZoom: number;
  };
  onViewStateChange: (info: any) => void;
  layers: any[];
  getTooltip?: (info: any) => any;
}

export function MapContainer({ 
  viewState, 
  onViewStateChange, 
  layers
}: MapContainerProps) {
  return (
    <DeckGL
      initialViewState={viewState}
      onViewStateChange={onViewStateChange}
      controller={true}
      layers={layers}
    >
      <MapGL
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
      />
    </DeckGL>
  );
}