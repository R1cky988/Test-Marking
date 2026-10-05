package com.example.testmarking.adapter.persistance.repository;

import aj.org.objectweb.asm.commons.Remapper;
import com.example.testmarking.domain.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

}
