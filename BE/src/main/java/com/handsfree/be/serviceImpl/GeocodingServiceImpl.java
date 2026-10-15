package com.handsfree.be.serviceImpl;
import com.handsfree.be.dto.request.LocationData;
import com.handsfree.be.exception.*;
import com.handsfree.be.service.GeocodingService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.JsonNode;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
@Service
public class GeocodingServiceImpl implements GeocodingService {
    private final String key;
    private final int dailyLimit;
    private final ObjectMapper json;
    private final HttpClient client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    private final Map<String,Cached> cache=new LinkedHashMap<>();
    private final Map<UUID,Long> users=new HashMap<>();
    private final ArrayDeque<Long> calls=new ArrayDeque<>();
    private LocalDate day=LocalDate.now(ZoneOffset.UTC);
    private int dailyCalls;
    private record Cached(long expires,List<LocationData> results) {}
    public GeocodingServiceImpl(@Value("${GEOAPIFY_API_KEY:}") String key,@Value("${GEOAPIFY_DAILY_REQUEST_LIMIT:1000}") int dailyLimit,ObjectMapper json){this.key=key;this.dailyLimit=Math.max(1,dailyLimit);this.json=json;}
    public List<LocationData> search(UUID user,String text,Double lat,Double lon) {
        if(text==null||text.trim().length()<3||text.length()>200)throw new AppException(ErrorCode.VALIDATION_FAILED);
        coordinates(lat,lon);
        String query="autocomplete?format=json&lang=vi&filter=countrycode:vn&limit=5&text="+enc(text.trim());
        if(lat!=null) query+="&bias="+enc("proximity:"+lon+","+lat);
        return call(user,query);
    }
    public List<LocationData> reverse(UUID user,double lat,double lon){coordinates(lat,lon);return call(user,"reverse?format=json&lang=vi&limit=1&lat="+lat+"&lon="+lon);}
    public static void coordinates(Double lat,Double lon){if((lat==null)!=(lon==null)||lat!=null&&(!Double.isFinite(lat)||!Double.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180))throw new AppException(ErrorCode.VALIDATION_FAILED);}
    private static String enc(String s){return URLEncoder.encode(s,StandardCharsets.UTF_8);}
    private synchronized List<LocationData> cachedOrReserve(UUID user,String query){
        long now=System.currentTimeMillis(); String id=user+":"+query;
        cache.entrySet().removeIf(e->e.getValue().expires()<now);
        var hit=cache.get(id); if(hit!=null)return hit.results();
        if(key.isBlank())throw new AppException(ErrorCode.MAP_UNAVAILABLE);
        users.entrySet().removeIf(e->now-e.getValue()>60000);
        while(!calls.isEmpty()&&now-calls.peekFirst()>=1000)calls.removeFirst();
        LocalDate today=LocalDate.now(ZoneOffset.UTC);if(!today.equals(day)){day=today;dailyCalls=0;}
        if(now-users.getOrDefault(user,0L)<450 || calls.size()>=3 || dailyCalls>=dailyLimit)throw new AppException(ErrorCode.MAP_RATE_LIMIT);
        users.put(user,now);calls.add(now);dailyCalls++;return null;
    }
    private List<LocationData> call(UUID user,String query){
        var hit=cachedOrReserve(user,query);if(hit!=null)return hit;
        try {
            var response=client.send(HttpRequest.newBuilder(URI.create("https://api.geoapify.com/v1/geocode/"+query+"&apiKey="+enc(key)))
                    .timeout(Duration.ofSeconds(8)).header("Accept","application/json").GET().build(),HttpResponse.BodyHandlers.ofString());
            if(response.statusCode()==429)throw new AppException(ErrorCode.MAP_RATE_LIMIT);
            if(response.statusCode()!=200)throw new AppException(ErrorCode.MAP_UNAVAILABLE);
            List<LocationData> results=new ArrayList<>();
            for(JsonNode n:json.readTree(response.body()).path("results")) {
                if(!"vn".equalsIgnoreCase(n.path("country_code").asText()) || !n.path("lat").isNumber() || !n.path("lon").isNumber())continue;
                var parts=new LinkedHashSet<String>();
                for(String name:List.of("suburb","district","city","county","state")){String v=n.path(name).asText("");if(!v.isBlank())parts.add(v);}
                String area=String.join(", ",parts);if(area.isBlank())area="Việt Nam";
                String address=n.path("formatted").asText(area);
                results.add(new LocationData(address.substring(0,Math.min(255,address.length())),area.substring(0,Math.min(120,area.length())),n.path("lat").asDouble(),n.path("lon").asDouble()));
            }
            var immutable=List.copyOf(results);
            synchronized(this){if(cache.size()>=1000)cache.remove(cache.keySet().iterator().next());cache.put(user+":"+query,new Cached(System.currentTimeMillis()+1800000,immutable));}
            return immutable;
        }catch(AppException e){throw e;}catch(InterruptedException e){Thread.currentThread().interrupt();throw new AppException(ErrorCode.MAP_UNAVAILABLE);}catch(Exception e){throw new AppException(ErrorCode.MAP_UNAVAILABLE);}
    }
}
