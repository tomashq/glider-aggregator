const format = require('date-fns/format');
const { airFranceConfig } = require('../../config');

function expandPassengers(passengers) {
  var res = [];
  for(p of passengers) {
    // Create a default value
    if(!p.count) {
      res.push(p)
    }

    // Otherwise create one for each count
    else {
      for(let i=0; i<p.count; i++) {
        res.push(p);
      }
    } 
  }
  return res;
}

const mapNdcRequestData = ({itinerary, passengers}) => {
  //const departureTime = new Date(itinerary.segments[0].departureTime);
  const ndcRequestData = {
    ...airFranceConfig,
    PointOfSale: {
      RequestTime: (new Date(Date.now())).toISOString(),
    },
    CoreQuery: {
      // Origin Destinations contains the list of segments
      OriginDestinations: itinerary.segments.map(segment => ({
        OriginDestination: {
          // Departure Information
          Departure: {
            AirportCode: (segment.origin.locationType === 'airport' 
              ? segment.origin.iataCode : undefined),
            Date: format(new Date(segment.departureTime), 'yyyy-MM-dd'),
            Time: format(new Date(segment.departureTime), 'HH:mm'),
          },

          // Arrival Information
          Arrival: {
            AirportCode: segment.destination.locationType === 'airport' 
              ? segment.destination.iataCode : undefined,
          },
        },
      })),
      
      // Preference
      Preference: {
        CabinPreferences: {
          CabinType: {
            Code: 5, // Economy
          },
        },
      },

      // Lists
      DataLists: {
        PassengerList: expandPassengers(passengers).map(p => ({
          Passenger: {
            PTC: p.type,
          },
        })),
      },
    },
  };
 return ndcRequestData;
}

module.exports = {
  mapNdcRequestData,
};