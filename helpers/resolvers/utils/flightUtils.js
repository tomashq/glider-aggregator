const caDestinations = require('./cadest.json');
const GliderError = require('../../error');
const {
  offerManager,
  FlightOffer,
} = require('../../models/offer');

const getACDestinations = () =>{
  return caDestinations;
};

const get1ADestinations = () =>{
  return caDestinations;
};

// Fetching of the flight operators associated with the given origin and destination
module.exports.selectProvider = (origin, destination) => {
  origin = Array.isArray(origin) ? origin : [origin];
  destination = Array.isArray(destination) ? destination : [destination];

  const sdMapping = [
    {
      provider: '1A',
      destinations: get1ADestinations(),
    },
    {
      provider: 'AC',
      destinations: getACDestinations(),
    },
  ];

  return sdMapping
    .reduce((a, v) => {

      if (
        (v.destinations.filter(d => origin.includes(d)).length > 0 ||
          v.destinations.filter(d => destination.includes(d)).length > 0) &&
        !a.includes(v.provider)
      ) {
        a.push(v.provider);
      }

      return a;
    }, []);// temporary until we do not have a specific set for AF - ['AF']
};

module.exports.reMapPassengersInRequestBody = (offer, body) => {
  if (offer.extraData && offer.extraData.mappedPassengers) {
    body.offerItems = Object.entries(body.offerItems)
      .map(item => {
        item[1].passengerReferences = item[1].passengerReferences
          .split(' ')
          .map(r => offer.extraData.mappedPassengers[r])
          .join(' ');
        return item;
      })
      .reduce((a, v) => ({
        ...a,
        [v[0]]: v[1],
      }), {});
    body.passengers = Object.entries(body.passengers)
      .map(p => {
        p[0] = offer.extraData.mappedPassengers[p[0]];
        return p;
      })
      .reduce((a, v) => ({
        ...a,
        [v[0]]: v[1],
      }), {});
  } else {
    throw new GliderError(
      'Mapped passengers Ids not found in the offer',
      500,
    );
  }

  return body;
};

// Fetch Flight offers with type validation
module.exports.fetchFlightsOffersByIds = async offerIds => {
  // Retrieve the offers
  const offers = (await Promise.all(offerIds.map(
    offerId => offerManager.getOffer(offerId),
  )))
    // Should be FlightOffer of type and have same provider
    .filter((offer, i, array) => (
      offer instanceof FlightOffer &&
      offer.provider === array[0].provider
    ));

  if (offers.length === 0) {
    throw new GliderError(
      'Offer not found',
      400,
    );
  }

  return offers;
};

// Removes passengers dublicates from offered priced options
// makes ONE passenger per OPTION
module.exports.dedupPassengersInOptions = (options) => options
  .reduce(
    (a, v) => {
      const option = a.filter(o => o.code === v.code);
      if (option.length > 0) {
        option[0].passenger = [
          ...new Set([
            ...option[0].passenger.split(' '),
            ...v.passenger.split(' '),
          ]),
        ].join(' ');
      } else {
        a.push(v);
      }
      return a;
    },
    [],
  )
  .reduce(
    (a, v) => {
      v.passenger
        .split(' ')
        .forEach(passenger => {
          a.push({
            ...v,
            passenger,
          });
        });
      return a;
    },
    [],
  );
